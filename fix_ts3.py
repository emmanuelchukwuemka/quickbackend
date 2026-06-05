import os
import re

def fix_models(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Fix duplicate identifiers
    content = re.sub(r'\{ id\?: string; id\?: string \}', '{ id?: string }', content)
    content = re.sub(r'this\.id! = data\.id! \|\| data\.id;', r'this.id = data.id;', content)
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

for root, dirs, files in os.walk('c:/Users/user/Documents/quick-backend/src/models'):
    for file in files:
        if file.endswith('.ts'):
            fix_models(os.path.join(root, file))

def fix_controllers(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Fix req.params.something to be casted as string
    content = re.sub(r'(req\.params\.[\w]+)(?! as string)', r'\1 as string', content)
    
    # Fix req.query.something to be casted as string
    content = re.sub(r'(req\.query\.[\w]+)(?! as string)', r'\1 as string', content)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

for root, dirs, files in os.walk('c:/Users/user/Documents/quick-backend/src/controllers'):
    for file in files:
        if file.endswith('.ts'):
            fix_controllers(os.path.join(root, file))
            
# Also fix routes
for root, dirs, files in os.walk('c:/Users/user/Documents/quick-backend/src/routes'):
    for file in files:
        if file.endswith('.ts'):
            fix_controllers(os.path.join(root, file))

print("Fixed TS errors round 3.")
