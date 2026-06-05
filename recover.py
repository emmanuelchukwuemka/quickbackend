import json
import os

log_file = r'C:\Users\user\.gemini\antigravity\brain\e83f7951-4fe4-4b47-9b32-c8df74b6d4ae\.system_generated\logs\transcript.jsonl'

files_to_recover = [
    'adminController.ts',
    'authController.ts',
    'driverController.ts',
    'rideController.ts',
    'userController.ts'
]

found_contents = {}

if os.path.exists(log_file):
    with open(log_file, 'r', encoding='utf-8') as f:
        for line in f:
            try:
                data = json.loads(line)
                if 'tool_calls' in data:
                    for tc in data['tool_calls']:
                        if tc.get('name') == 'default_api:view_file' and 'response' in tc:
                            output = tc['response'].get('output', '')
                            for filename in files_to_recover:
                                if f"File Path: `file:///c:/Users/user/Documents/quick-backend/src/controllers/{filename}`" in output:
                                    # Extract the file content
                                    lines = output.split('\n')
                                    content_lines = []
                                    in_content = False
                                    for l in lines:
                                        if 'The following code has been modified' in l:
                                            in_content = True
                                            continue
                                        if 'The above content shows the entire' in l:
                                            in_content = False
                                            break
                                        if in_content:
                                            # remove line numbers like "1: "
                                            parts = l.split(': ', 1)
                                            if len(parts) == 2 and parts[0].isdigit():
                                                content_lines.append(parts[1])
                                            else:
                                                content_lines.append(l)
                                    found_contents[filename] = '\n'.join(content_lines)
            except:
                pass

for k, v in found_contents.items():
    print(f"Recovered {k} ({len(v)} bytes)")
    with open(f'c:/Users/user/Documents/quick-backend/src/controllers/{k}', 'w', encoding='utf-8') as f:
        f.write(v)

print("Missing:", set(files_to_recover) - set(found_contents.keys()))
