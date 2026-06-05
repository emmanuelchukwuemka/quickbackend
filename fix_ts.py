import os
import re

def fix_ts_errors(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Fix: Argument of type 'string | string[]' is not assignable to parameter of type 'string'
    # Typically req.query.something or req.headers.something
    # We can replace things like `User.findById(id)` if id comes from query, but a safer regex is:
    content = re.sub(r'(req\.query\.\w+)(?! as string)', r'\1 as string', content)
    content = re.sub(r'(req\.headers\[[\'"]authorization[\'"]\])(?! as string)', r'\1 as string', content)

    # Fix: 'xxx._id' is possibly 'undefined' - since we moved to Postgres, it should be xxx.id and we can assert it with !
    content = re.sub(r'(\w+)\._id', r'\1.id!', content)
    
    # Fix: test files using .lat and .lng inside location object instead of coordinates array
    content = re.sub(r'location:\s*\{\s*lat:\s*([^,]+),\s*lng:\s*([^ }]+)\s*\}', r'location: { type: "Point", coordinates: [\2, \1] }', content)
    content = re.sub(r'pickup:\s*\{\s*lat:\s*([^,]+),\s*lng:\s*([^ }]+)\s*\}', r'pickup: { type: "Point", coordinates: [\2, \1] }', content)
    content = re.sub(r'dropoff:\s*\{\s*lat:\s*([^,]+),\s*lng:\s*([^ }]+)\s*\}', r'dropoff: { type: "Point", coordinates: [\2, \1] }', content)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

for root, dirs, files in os.walk('c:/Users/user/Documents/quick-backend/src'):
    for file in files:
        if file.endswith('.ts'):
            fix_ts_errors(os.path.join(root, file))

print("Fixed TS errors.")
