import asyncio
from mistralai.client import Mistral

async def main():
    client = Mistral(api_key="fake")
    try:
        from mistralai.models import ResponseFormat
        print("Imported ResponseFormat from mistralai.models")
    except ImportError as e:
        print("ImportError:", e)
        try:
            print("mistralai.models:", dir(client.models))
        except:
            pass

if __name__ == "__main__":
    asyncio.run(main())
