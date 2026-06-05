import os
import re

def fix_models(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Replace _id with id in interfaces and classes
    content = re.sub(r'\b_id\?: string;', r'id?: string;', content)
    content = re.sub(r'this\._id = ', r'this.id = ', content)
    content = re.sub(r'this\._id ', r'this.id ', content)
    content = re.sub(r'_id: row\.id', r'id: row.id', content)
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

for root, dirs, files in os.walk('c:/Users/user/Documents/quick-backend/src/models'):
    for file in files:
        if file.endswith('.ts'):
            fix_models(os.path.join(root, file))

def fix_controllers(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Replace req.query.something with as string
    content = re.sub(r'(req\.query\.[\w]+)(?! as string)', r'\1 as string', content)
    content = re.sub(r'(req\.headers\[[\'"]authorization[\'"]\])(?! as string)', r'\1 as string', content)
    
    # Fix req.query destructuring
    content = re.sub(r'const \{ (id) \} = req.query;', r'const id = req.query.id as string;', content)
    content = re.sub(r'const \{ (rideId) \} = req.query;', r'const rideId = req.query.rideId as string;', content)
    content = re.sub(r'const \{ (userId) \} = req.query;', r'const userId = req.query.userId as string;', content)
    content = re.sub(r'const \{ (driverId) \} = req.query;', r'const driverId = req.query.driverId as string;', content)
    
    # Fix 'ride.passenger_ref' is possibly 'undefined'
    content = re.sub(r'ride\.passenger_ref(?!!)', r'ride.passenger_ref!', content)
    content = re.sub(r'activeRide\.passenger_ref(?!!)', r'activeRide.passenger_ref!', content)
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

for root, dirs, files in os.walk('c:/Users/user/Documents/quick-backend/src/controllers'):
    for file in files:
        if file.endswith('.ts'):
            fix_controllers(os.path.join(root, file))
            
# Fix socketManager.ts
socket_file = 'c:/Users/user/Documents/quick-backend/src/sockets/socketManager.ts'
if os.path.exists(socket_file):
    with open(socket_file, 'r', encoding='utf-8') as f:
        content = f.read()
    content = re.sub(r'activeRide\.passenger_ref(?!!)', r'activeRide.passenger_ref!', content)
    with open(socket_file, 'w', encoding='utf-8') as f:
        f.write(content)

# Fix rideRoutes.ts
route_file = 'c:/Users/user/Documents/quick-backend/src/routes/rideRoutes.ts'
if os.path.exists(route_file):
    fix_controllers(route_file)

print("Fixed TS errors round 2.")
