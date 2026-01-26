/**
 * Calcula a distância entre dois pontos usando a fórmula de Haversine (em KM)
 */
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  if (isNaN(lat1) || isNaN(lon1) || isNaN(lat2) || isNaN(lon2)) return 999999;
  
  const R = 6371; // Raio da Terra em km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

/**
 * Verifica se um ponto está dentro de um polígono (Algoritmo de Ray Casting)
 */
export function isPointInPolygon(point: [number, number], polygon: [number, number][]): boolean {
  if (!polygon || !Array.isArray(polygon) || polygon.length < 3) return false;
  
  const x = point[0], y = point[1];
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0], yi = polygon[i][1];
    const xj = polygon[j][0], yj = polygon[j][1];
    
    const intersect = ((yi > y) !== (yj > y)) &&
        (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Validação completa de entrega
 */
export function canDeliver(
  customerLat: number | undefined | null, 
  customerLng: number | undefined | null, 
  storeLat: number | undefined | null, 
  storeLng: number | undefined | null, 
  radiusKm: number, 
  exclusionPolygons: [number, number][][] | undefined | null
): boolean {
  // Validação básica de entrada
  if (customerLat == null || customerLng == null || storeLat == null || storeLng == null) return false;

  // 1. Verificar raio
  const distance = calculateDistance(customerLat, customerLng, storeLat, storeLng);
  if (distance > (radiusKm || 5)) return false;

  // 2. Verificar áreas de exclusão
  if (exclusionPolygons && Array.isArray(exclusionPolygons)) {
    for (const polygon of exclusionPolygons) {
      if (isPointInPolygon([customerLat, customerLng], polygon)) {
        return false; // Está dentro de uma área proibida
      }
    }
  }

  return true;
}