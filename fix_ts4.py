import os
import re

def fix_controllers(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Fix const { id } = req.params;
    content = re.sub(r'const \{\s*(\w+)\s*\}\s*=\s*req\.params;', r'const \1 = req.params.\1 as string;', content)
    
    # Fix req.params.something directly used without as string
    content = re.sub(r'req\.params\.(\w+)(?! as string)', r'req.params.\1 as string', content)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

for root, dirs, files in os.walk('c:/Users/user/Documents/quick-backend/src/controllers'):
    for file in files:
        if file.endswith('.ts'):
            fix_controllers(os.path.join(root, file))
            
print("Fixed TS errors round 4.")
