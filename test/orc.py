# Please install OpenAI SDK first: `pip3 install openai`

from openai import OpenAI

client = OpenAI(
    api_key="sk-vzZxxJOoMtkTHTgVuc8pJgCxl9nwnD7L1useLhndLUr6RBAD",
    base_url="https://gptgod.online/api/v1",
)

response = client.chat.completions.create(
    model="gpt-4o-mini",
    messages=[
        {
            "role": "user",
            "content": [
                {"type": "text", "text": "提取图片中的所有文字内容"},
                {
                    "type": "image_url",
                    "image_url": {
                        "url": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAHAAAAAZCAYAAADpG6rZAAAAAXNSR0IArs4c6QAADUVJREFUaEPtmgl0VVWWhr/z5iEDg6KlgoBAJQiIQpEATiigDYqUyGANIhBJ3os0GkCFgJSrSkpQAskjSiAQlalFsGitbkTtkmYoJSEkAVoJU0IggTCEzORN9/Y65yV0Va3GhFrQnVpy13prJXc65+x/7/3v/Z8rOnXqpPMjPnQh0BHKAgINgy5/qHOha637ED92AFs3PM3P7gaAzduoVd9xA8BWDU/zk7sBYPM2atV3/F0A6kISPghdR0jCb9VkL9CEkCUJQg9iQA8VKBhaNTAtndxVAyjB0ySAuo5Z0zDqEBSCoGidBpHgacKErCvN+iWMul/+RRB5LlR9/iMfVw2gBC/OFc/g2FjeX5bO/py9XAoG8Rukb1/ZILowEGw0pOmyIU1o19mQmjAQEGbi419g5CMxn…0LkxEOFh0mZ88unhp4H59u2MCX3+ZSEZACggOz2cxrSVMZHHsvZotUYQTHjnzfoj5Ql7tBV/qkIqRSyFJdikN+pbA0biKplCeVBVk0yHOy15Iit1T61XaNHlL6hfADgcsSGeqqfG9oe0dKS0qGEkF1ThYlmpSi5HcpcmTpKWqIkJwWUoJCOx/yXqUQSQlMD6giR6ocsmqVjb5UbOS7UFJWkwDmU9KcEt11Q+NWWKjqlaf+SmRXc5Gj6Zg0KSEK1T4NHDiQdWlpHGzUgKWI3yTyNQkMUj6T05cKkBBSOgsJbRZNzlH+HxIQ5P2NFlSSXJN9QxJk89LhDwLYXHn+Y7suHUy2FU3tkwJQ12loRsS/nna6AeBVWPcGgFdhrNZ4qwRQ7sI0ceL+7L3UNe2D/sA22rVci4y4vz2a3Y24lhP4R36X/BIhtM0U4kT5KUlIMP+/29WXAK5Zs4aYmJjLpvxv5fHKoSGIXPoAAAAASUVORK5CYII="
                    },
                },
            ],
        }
    ],
    stream=False,
)

print(response.choices[0].message.content)

# body = {"model":"gpt-4o-mini","messages":1}
