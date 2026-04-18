import asyncio
from mistralai.client import Mistral

async def main():
    client = Mistral(api_key="x")
    print(dir(client.chat))
    
    # Try mistralai 2.4.0 async complete method name
    try:
        if hasattr(client.chat, "complete_async"):
            print("Has complete_async")
        if hasattr(client.chat, "complete"):
            print("Has complete")
    except Exception as e:
        print(e)

if __name__ == "__main__":
    asyncio.run(main())
