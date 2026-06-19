from objects.Container import Container
from utils.CustomJSONEncoder import CustomJSONEncoder

from IPython.display import IFrame, display
import json
import urllib.parse


def container_visualization(data: Container):

    json_string = json.dumps(
        data.model_dump(),
        cls=CustomJSONEncoder
    )

    encoded = urllib.parse.quote(
        json_string,
        safe=""
    )

    url = (
        "http://localhost:5173/container-visualization"
        f"?data={encoded}"
    )
    print(url)
    display(
        IFrame(
            src=url,
            width="100%",
            height=700
        )
    )