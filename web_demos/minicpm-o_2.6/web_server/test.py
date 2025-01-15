from flask import Flask, request, Response, stream_with_context
import requests
import json
import os

app = Flask(__name__)

def handle_streaming_response(response):
    def generate():
        for line in response.iter_lines():
            if line:
                try:
                    json_response = json.loads(line)
                    if 'choices' in json_response:
                        content = json_response['choices'][0].get('delta', {}).get('content', '')
                        if content:
                            yield content
                except json.JSONDecodeError:
                    yield f"Error parsing streaming response: {line}"
    return generate()

@app.route('/v1/chat/completions', methods=['POST'])
def proxy_chat():
  api_key = os.getenv('TOGETHERAI_API_KEY', '').strip()

  if not api_key:
    return {"error": "API key not found"}, 500
  print('here')
  URL = "https://api.together.xyz/v1/chat/completions"

  # Forward the incoming request payload
  payload = request.json

  headers = {
    "Authorization": f"Bearer {api_key.strip()}",
    "Content-Type": "application/json"
  }


  response = requests.post(URL, headers=headers, json=payload,
                timeout=30, stream=payload.get('stream', True))

  
  if payload.get('stream', True):
    return Response(stream_with_context(handle_streaming_response(response)),
            content_type='text/event-stream')
  else:
    return response.json()

  
@app.route('/models', methods=['GET'])
def proxy_models():
    api_key = os.getenv('TOGETHERAI_API_KEY', '').strip()
    print(api_key)
    if not api_key:
        return {"error": "API key not found"}, 500

    URL = "https://api.together.xyz/v1/models"
    
    headers = {
        "Authorization": f"Bearer {api_key.strip()}",
        "Content-Type": "application/json"
    }

    try:
        response = requests.get(URL, headers=headers, timeout=30)
        response.raise_for_status()
        return response.json()

    except requests.exceptions.RequestException as e:
        print(str(e))
        
        return response

if __name__ == '__main__':
  app.run(debug=True, port=5001)
