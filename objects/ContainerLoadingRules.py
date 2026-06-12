


from pydantic import Field
from utils.PydanticBaseModel import PydanticBaseModel



class ContainerLoadingRules(PydanticBaseModel):
	allowStacking: bool=Field(default=False, description= "Stacking allowed flag")
	maxStackHeightIn_mm: float=Field(default=1, description= "Maximum stacking height in millimeter (mm)")
	lifoEnabled: bool=Field(default=True, description= "Order of item loading flag: Last-in first-out")
	fragileSeparation: bool=Field(default=True, description= "Fragile separation flag")
	hazmatSegregation: bool=Field(default=True, description= "Hazardous material segregation")
	centerGravityThreshold: float=Field(default=15, description= "Center Gravity Threshold")
