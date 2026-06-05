import json
import os

log_file = r'C:\Users\user\.gemini\antigravity\brain\e83f7951-4fe4-4b47-9b32-c8df74b6d4ae\.system_generated\logs\transcript.jsonl'

with open('scratch.txt', 'w', encoding='utf-8') as out:
    if os.path.exists(log_file):
        with open(log_file, 'r', encoding='utf-8') as f:
            for line in f:
                if 'userController.ts' in line or 'adminController.ts' in line or 'driverController.ts' in line or 'authController.ts' in line or 'rideController.ts' in line:
                    if 'The following code has been modified' in line or 'export const' in line:
                        out.write(line + '\n')
