from datetime import datetime
from typing import Optional, Literal, Union, Annotated, List

from pydantic import BaseModel, Field

CategorySlug = Literal["decor", "clothing", "school-supplies", "tickets", "miscellaneous"]

ColorValue = Literal[
    "RED",
    "ORANGE",
    "YELLOW",
    "GREEN",
    "BLUE",
    "PURPLE",
    "PINK",
    "BLACK",
    "WHITE",
    "BROWN",
    "GREY",
    "OTHER",
]

ClothingGender = Literal["MENS", "WOMENS", "UNISEX", "KIDS"]
ClothingSize = Literal[
    "XS",
    "S",
    "M",
    "L",
    "XL",
    "XXL",
    "PLUS",
    "US_5",
    "US_5.5",
    "US_6",
    "US_6.5",
    "US_7",
    "US_7.5",
    "US_8",
    "US_8.5",
    "US_9",
    "US_9.5",
    "US_10",
    "US_10.5",
    "US_11",
    "US_11.5",
    "US_12",
    "US_12.5",
    "OTHER",
]
ClothingType = Literal["SHIRTS", "BOTTOMS", "SWEATERS", "TOPS", "SHOES", "FORMALS", "ACCESSORY", "OTHER"]
DecorType = Literal[
    "LIGHTS",
    "RUGS",
    "DISPLAY_ITEMS",
    "FURNITURE",
    "STORAGE",
    "ORGANIZERS",
    "LAMPS",
    "OTHER",
]
TicketType = Literal["SPORT", "EVENTS", "MOVIES", "PERFORMANCE", "OTHER"]
TransactionPaymentMethod = Literal["CASH", "STRIPE"]
OrderStatus = Literal["pending_meetup", "buyer_confirmed", "seller_confirmed", "complete"]
ReportCategory = Literal["NO_SHOW", "PAYMENT_ISSUE", "ITEM_NOT_AS_DESCRIBED", "SCAM", "OTHER"]
ReportStatus = Literal["OPEN", "UNDER_REVIEW", "RESOLVED", "DISMISSED"]


class CategoryDetailsBase(BaseModel):
    category: CategorySlug


class ClothingDetails(CategoryDetailsBase):
    category: Literal["clothing"] = Field("clothing")
    gender: ClothingGender
    size: ClothingSize
    type: ClothingType
    color: ColorValue
    used: bool = Field(False, description="Whether the item is used")


class DecorDetails(CategoryDetailsBase):
    category: Literal["decor"] = Field("decor")
    type: DecorType
    color: ColorValue
    used: bool = Field(False, description="Whether the item is used")
    length: Optional[int] = Field(None, ge=0, description="Length in inches")
    width: Optional[int] = Field(None, ge=0, description="Width in inches")
    height: Optional[int] = Field(None, ge=0, description="Height in inches")


class TicketDetails(CategoryDetailsBase):
    category: Literal["tickets"] = Field("tickets")
    type: TicketType


class SchoolSuppliesDetails(CategoryDetailsBase):
    category: Literal["school-supplies"] = Field("school-supplies")
    type: Optional[str] = Field(None, description="Optional school supplies subtype")
    used: bool = Field(False, description="Whether the item is used")


class MiscellaneousDetails(CategoryDetailsBase):
    category: Literal["miscellaneous"] = Field("miscellaneous")
    type: Optional[str] = Field(None, description="Optional miscellaneous subtype")


CategoryDetails = Annotated[
    Union[ClothingDetails, DecorDetails, TicketDetails, SchoolSuppliesDetails, MiscellaneousDetails],
    Field(discriminator="category"),
]


class ListingBase(BaseModel):
    # base attributes for product creation/update

    name: str = Field(..., example="Microwave")
    description: Optional[str] = Field(
        None,
        description="Long-form description shown on the listing detail page",
        example="Gently used microwave in excellent condition.",
        max_length=1500,
    )
    price: float = Field(..., example=25.0, gt=0, description="Price in dollars")
    quantity: int = Field(1, ge=0, description="Quantity available")
    category: CategorySlug = Field(
        ...,
        description="Category slug used for homepage grouping",
        example="decor",
    )
    details: Optional[CategoryDetails] = Field(
        None,
        description="Category-specific attributes (required for clothing, decor, and tickets)",
    )


class ListingCreate(ListingBase):
    # payload is required to create a new product listing

    @classmethod
    def _requires_details(cls, category: Optional[str]) -> bool:
        return category in {"clothing", "decor", "tickets"}

    @classmethod
    def _validate_details(cls, category: Optional[str], details: Optional[CategoryDetails]) -> None:
        if not category:
            return
        if cls._requires_details(category) and details is None:
            raise ValueError(f"Details are required when creating a {category} listing")
        if details is not None and details.category != category:
            raise ValueError("Details category must match the listing category")

    def __init__(self, **data):
        super().__init__(**data)
        self._validate_details(self.category, self.details)


class ListingUpdate(BaseModel):
    # partial update payload for product listings

    name: Optional[str] = Field(None, example="Microwave")
    description: Optional[str] = Field(
        None,
        description="Long-form description shown on the listing detail page",
        example="Gently used microwave in excellent condition.",
        max_length=1500,
    )
    price: Optional[float] = Field(None, gt=0, description="Price in dollars")
    quantity: Optional[int] = Field(None, ge=0, description="Quantity available")
    sold: Optional[bool] = Field(None, description="Whether the item is sold")
    category: Optional[CategorySlug] = Field(
        None,
        description="Category slug used for homepage grouping",
        example="decor",
    )
    details: Optional[CategoryDetails] = Field(
        None,
        description="Category-specific attributes to replace the existing ones",
    )

    @classmethod
    def _requires_details(cls, category: Optional[str]) -> bool:
        return category in {"clothing", "decor", "tickets"}

    def __init__(self, **data):
        super().__init__(**data)
        category = getattr(self, "category", None)
        details = getattr(self, "details", None)
        if category and self._requires_details(category) and details is None:
            raise ValueError(f"Details are required when changing a listing to {category}")
        if details is not None and category and details.category != category:
            raise ValueError("Details category must match the listing category")


class Listing(ListingBase):
    # full representation of a product listing including server-managed fields

    id: str
    seller_id: str
    sold: bool = Field(False, description="Whether the item has been sold")
    created_at: datetime

    class Config:
        orm_mode = True


class OrderCreate(BaseModel):
    # payload required to create a new transaction

    listing_id: str = Field(..., example="6c73f63a-4f0f-4a84-9620-3aafc4a5d1b5")
    payment_method: Optional[TransactionPaymentMethod] = Field(
        None, example="CASH", description="Preferred payment method"
    )


class Order(BaseModel):
    # full representation for a transaction

    id: str
    listing_id: str
    buyer_id: str
    seller_id: Optional[str] = Field(None, description="Seller for the associated product")
    payment_method: Optional[TransactionPaymentMethod] = Field(
        None, example="CASH", description="Preferred payment method"
    )
    created_at: Optional[datetime] = None
    product: Optional[Listing] = None
    buyer_confirmed: bool = Field(False, description="Buyer confirmed receiving the item")
    seller_confirmed: bool = Field(False, description="Seller confirmed receiving payment")
    buyer_confirmed_at: Optional[datetime] = None
    seller_confirmed_at: Optional[datetime] = None
    buyer_confirmation_notes: Optional[str] = Field(None, max_length=500)
    seller_confirmation_notes: Optional[str] = Field(None, max_length=500)
    status: OrderStatus = Field("pending_meetup", description="Derived transaction status")

    class Config:
        orm_mode = True


class OrderUpdate(BaseModel):
    payment_method: Optional[TransactionPaymentMethod] = Field(
        None, example="CASH", description="Preferred payment method"
    )


class OrderConfirmation(BaseModel):
    notes: Optional[str] = Field(
        None,
        max_length=500,
        description="Optional short note recorded with the confirmation",
    )


class ReportBase(BaseModel):
    reported_user_id: str = Field(..., description="User being reported")
    transaction_id: Optional[str] = Field(
        None, description="Optional transaction involved in the report"
    )
    category: ReportCategory = Field(..., description="Type of issue encountered")
    description: str = Field(
        ...,
        min_length=10,
        max_length=2000,
        description="Description of what happened",
    )
    evidence_urls: List[str] = Field(
        default_factory=list,
        description="Optional supporting evidence URLs",
    )


class ReportCreate(ReportBase):
    pass


class Report(ReportBase):
    id: str
    reporter_id: str
    status: ReportStatus = Field("OPEN", description="Workflow status of the report")
    resolution_notes: Optional[str] = Field(
        None, description="Moderator notes when the report is resolved or dismissed"
    )
    resolved_by: Optional[str] = Field(None, description="Moderator who resolved the report")
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True


class ReportUpdate(BaseModel):
    status: Optional[ReportStatus] = None
    resolution_notes: Optional[str] = Field(
        None, max_length=2000, description="Moderator notes about this report"
    )
    evidence_urls: Optional[List[str]] = None
    description: Optional[str] = Field(
        None, min_length=10, max_length=2000, description="Updated description from reporter"
    )


class MyReports(BaseModel):
    filed: List[Report] = Field(default_factory=list)
    against: List[Report] = Field(default_factory=list)


class UserProfile(BaseModel):
    id: str
    email: Optional[str] = None
    full_name: Optional[str] = None
    profile_description: Optional[str] = None
    avatar_path: Optional[str] = None
    avatar_url: Optional[str] = None

    class Config:
        orm_mode = True
