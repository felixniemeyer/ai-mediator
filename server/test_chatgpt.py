import openai

openai.api_key = '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';

test_create = openai.ChatCompletion.create(
  model="gpt-3.5-turbo",
  messages=[
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": "Who won the world series in 2020?"},
        {"role": "assistant", "content": "The Los Angeles Dodgers won the World Series in 2020."},
        {"role": "user", "content": "Where was it played?"}
    ]
)
import pdb;pdb.set_trace()
