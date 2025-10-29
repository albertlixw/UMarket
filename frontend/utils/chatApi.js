import { supabase } from './supabaseClient';

const AVATAR_BUCKET = process.env.NEXT_PUBLIC_SUPABASE_AVATAR_BUCKET || 'avatars';

function normalizeChatRow(row) {
  if (!row) return null;
  const { chat_messages: messageGroup, ...rest } = row;
  const lastMessageArray = Array.isArray(messageGroup) ? messageGroup : [];
  const lastMessage = lastMessageArray[0] || null;
  return {
    id: rest.id,
    productId: rest.product_id,
    buyerId: rest.buyer_id,
    sellerId: rest.seller_id,
    createdAt: rest.created_at,
    updatedAt: rest.updated_at,
    product: rest.product || null,
    buyer: rest.buyer || null,
    seller: rest.seller || null,
    lastMessage,
  };
}

export async function fetchChats(userId) {
  if (!userId) return [];
  const { data, error } = await supabase
    .from('chats')
    .select(
      `
        id,
        product_id,
        buyer_id,
        seller_id,
        created_at,
        updated_at,
        product:Product (
          prod_id,
          name,
          price,
          seller_id
        ),
        buyer:profiles!chats_buyer_id_fkey (
          id,
          full_name,
          email
        ),
        seller:profiles!chats_seller_id_fkey (
          id,
          full_name,
          email
        ),
        chat_messages (
          id,
          body,
          sender_id,
          created_at,
          edited_at
        )
      `,
    )
    .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
    .order('updated_at', { ascending: false })
    .order('created_at', { ascending: false, foreignTable: 'chat_messages' })
    .limit(1, { foreignTable: 'chat_messages' });
  if (error) {
    throw new Error(error.message || 'Failed to load conversations');
  }
  return Array.isArray(data) ? data.map(normalizeChatRow) : [];
}

export async function fetchChatMessages(chatId, { limit = 100, before } = {}) {
  if (!chatId) return [];
  let query = supabase
    .from('chat_messages')
    .select('*')
    .eq('chat_id', chatId)
    .order('created_at', { ascending: true })
    .limit(limit);
  if (before) {
    query = query.lt('created_at', before);
  }
  const { data, error } = await query;
  if (error) {
    throw new Error(error.message || 'Failed to load messages');
  }
  return Array.isArray(data) ? data : [];
}

export async function sendChatMessage(chatId, body, senderId) {
  if (!chatId || !body || !senderId) {
    throw new Error('Missing chat message payload');
  }
  const { data, error } = await supabase
    .from('chat_messages')
    .insert({ chat_id: chatId, body, sender_id: senderId })
    .select()
    .single();
  if (error) {
    throw new Error(error.message || 'Failed to send message');
  }
  return data;
}

export async function markMessagesRead(messageIds, userId) {
  const ids = Array.isArray(messageIds) ? messageIds.filter(Boolean) : [];
  if (!ids.length || !userId) return;
  const payload = ids.map((messageId) => ({
    message_id: messageId,
    user_id: userId,
    read_at: new Date().toISOString(),
  }));
  const { error } = await supabase.from('message_receipts').upsert(payload, {
    onConflict: 'message_id,user_id',
  });
  if (error) {
    console.error('Failed to mark messages read', error);
  }
}

export async function fetchMessageReceipts(messageIds, userId) {
  const ids = Array.isArray(messageIds) ? messageIds.filter(Boolean) : [];
  if (!ids.length || !userId) return {};
  const { data, error } = await supabase
    .from('message_receipts')
    .select('message_id, read_at')
    .eq('user_id', userId)
    .in('message_id', ids);
  if (error) {
    console.error('Failed to load message receipts', error);
    return {};
  }
  const map = {};
  for (const row of data || []) {
    map[row.message_id] = row.read_at;
  }
  return map;
}

export function subscribeToChatMessages(chatId, handler) {
  if (!chatId) return null;
  const channel = supabase
    .channel(`chat-messages-${chatId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'chat_messages', filter: `chat_id=eq.${chatId}` },
      handler,
    )
    .subscribe((status) => {
      if (status === 'CHANNEL_ERROR') {
        console.error('Realtime subscription error for chat', chatId);
      }
    });
  return channel;
}

export function unsubscribeFromChannel(channel) {
  if (channel) {
    supabase.removeChannel(channel);
  }
}

export async function startChat(productId) {
  if (!productId) {
    throw new Error('Missing product id');
  }
  const { data, error } = await supabase.rpc('start_chat', { p_product_id: productId });
  if (error) {
    throw new Error(error.message || 'Failed to start chat');
  }
  return data;
}

export function getPublicAvatarUrl(path) {
  if (!path) return null;
  const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
  return data?.publicUrl || null;
}
