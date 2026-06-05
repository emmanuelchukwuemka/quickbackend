export const mapIdKeys = (condition: any): any => {
  if (!condition || typeof condition !== 'object') return condition;
  if (Array.isArray(condition)) return condition.map(mapIdKeys);

  const mapped: any = {};
  for (const key of Object.keys(condition)) {
    const value = condition[key];
    if (key === '_id') {
      mapped.id = value;
    } else if (key === '$or' || key === '$and') {
      mapped[key] = mapIdKeys(value);
    } else {
      mapped[key] = mapIdKeys(value);
    }
  }
  return mapped;
};

export const buildWhere = (condition: any = {}, values: any[] = []): { clause: string; values: any[] } => {
  condition = mapIdKeys(condition);
  if (!condition || Object.keys(condition).length === 0) {
    return { clause: 'TRUE', values }; 
  }

  const parts: string[] = [];

  for (const key of Object.keys(condition)) {
    const value = condition[key];

    if (key === '$or' && Array.isArray(value)) {
      const orParts = value.map((item: any) => {
        const result = buildWhere(item, values);
        values = result.values;
        return `(${result.clause})`;
      });
      parts.push(orParts.join(' OR '));
      continue;
    }

    if (key === '$and' && Array.isArray(value)) {
      const andParts = value.map((item: any) => {
        const result = buildWhere(item, values);
        values = result.values;
        return `(${result.clause})`;
      });
      parts.push(andParts.join(' AND '));
      continue;
    }

    if (key === 'location' && value?.$near) {
      const coords = value.$near.$geometry?.coordinates;
      const maxDistance = value.$near.$maxDistance || 5000;
      if (!Array.isArray(coords) || coords.length !== 2) {
        throw new Error('Invalid $near coordinates');
      }
      const [lng, lat] = coords;
      const degreeDistance = maxDistance / 111000;
      values.push(lat, lng, degreeDistance);
      const idx = values.length;
      parts.push(`((lat - $${idx - 2})^2 + ((lng - $${idx - 1}) * cos(radians($${idx - 2})))^2) <= $${idx}^2`);
      continue;
    }

    if (value && typeof value === 'object' && !Array.isArray(value)) {
      if ('$exists' in value) {
        parts.push(`${key} ${value.$exists ? 'IS NOT NULL' : 'IS NULL'}`);
        continue;
      }
      if ('$in' in value) {
        values.push(value.$in);
        parts.push(`${key} = ANY($${values.length})`);
        continue;
      }
      if ('$ne' in value) {
        values.push(value.$ne);
        parts.push(`${key} <> $${values.length}`);
        continue;
      }
      if ('$or' in value || '$and' in value) {
        const nested = buildWhere(value, values);
        values = nested.values;
        parts.push(`(${nested.clause})`);
        continue;
      }
      values.push(JSON.stringify(value));
      parts.push(`${key} = $${values.length}`);
    } else {
      values.push(value);
      parts.push(`${key} = $${values.length}`);
    }
  }

  return { clause: parts.join(' AND '), values };
};

export const buildUpdateSet = (updates: any, values: any[] = []): { set: string; values: any[] } => {
  const setParts: string[] = [];

  if (!updates || typeof updates !== 'object') {
    return { set: '', values };
  }

  const normalized = { ...updates };

  if ('location' in normalized && normalized.location?.coordinates) {
    const [lng, lat] = normalized.location.coordinates;
    normalized.lat = lat;
    normalized.lng = lng;
    delete normalized.location;
  }

  if ('pickup' in normalized && normalized.pickup?.coordinates) {
    const [lng, lat] = normalized.pickup.coordinates;
    normalized.pickup_lat = lat;
    normalized.pickup_lng = lng;
    delete normalized.pickup;
  }

  if ('dropoff' in normalized && normalized.dropoff?.coordinates) {
    const [lng, lat] = normalized.dropoff.coordinates;
    normalized.dropoff_lat = lat;
    normalized.dropoff_lng = lng;
    delete normalized.dropoff;
  }

  if (normalized.$inc && typeof normalized.$inc === 'object') {
    for (const key of Object.keys(normalized.$inc)) {
      const value = normalized.$inc[key];
      values.push(value);
      setParts.push(`${key} = ${key} + $${values.length}`);
    }
    delete normalized.$inc;
  }

  if (normalized.$push && typeof normalized.$push === 'object') {
    for (const key of Object.keys(normalized.$push)) {
      const value = normalized.$push[key];
      if (key === 'documents' && value?.$each) {
        values.push(JSON.stringify(value.$each));
        setParts.push(`documents = documents || $${values.length}::jsonb`);
      }
    }
    delete normalized.$push;
  }

  for (const key of Object.keys(normalized)) {
    if (key.startsWith('$')) continue;
    const value = normalized[key];
    if (value === undefined) continue;
    values.push(value);
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      setParts.push(`${key} = $${values.length}::jsonb`);
    } else {
      setParts.push(`${key} = $${values.length}`);
    }
  }

  return { set: setParts.join(', '), values };
};
