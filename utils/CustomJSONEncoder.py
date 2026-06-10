from datetime import datetime, time,date
import numpy as np
from json import JSONEncoder
from uuid import UUID
from fastapi.encoders import jsonable_encoder
from utils.utils import check_null
from utils.PydanticBaseModel import PydanticBaseModel
from pandas._libs.tslibs.nattype import NaTType


# JSON - Numpy Parse Adapter


class CustomJSONEncoder(JSONEncoder):

    def default(self, object):
        if isinstance(object, np.generic):
            return object.item()

        if isinstance(object, time):
            return object.strftime(r"%H:%M:%S")

        if isinstance(object, NaTType):
            return None

        if check_null(object):
            return None

        if isinstance(object, datetime):
            return object.strftime(r"%Y-%m-%d %H:%M:%S")
        
        if isinstance(object, date): 
            return object.isoformat()

        if isinstance(object, UUID):
            return str(object)

        if isinstance(object, np.ndarray):
            return object.tolist()

        if isinstance(object, (PydanticBaseModel)):
            return jsonable_encoder(object)

        return super().default(object)