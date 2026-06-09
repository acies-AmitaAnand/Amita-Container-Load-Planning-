


from pydantic import Field
from utils.PydanticBaseModel import PydanticBaseModel



class ContainerLoadingRules(PydanticBaseModel):
	allowStacking: bool=Field(description= "true")
	maxStackHeight: float=Field(description= "8")
	lifoEnabled: bool=Field(description= "true")
	fragileSeparation: bool=Field(description= "true")
	hazmatSegregation: bool=Field(description= "true")
	centerGravityThreshold: float=Field(description= "15")
