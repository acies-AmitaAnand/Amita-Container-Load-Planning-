


from objects.ShipmentGroup import ShipmentGroup
from utils.PydanticBaseModel import PydanticBaseModel

class GroupAllocation(PydanticBaseModel):
    """How many trucks are budgeted to a single lane group."""
    group: ShipmentGroup
    trucks_allocated: int          # containers this group may open
    trucks_needed_estimate: int    # based on pallet count / avg capacity
    is_fully_funded: bool          # True when allocated >= needed

