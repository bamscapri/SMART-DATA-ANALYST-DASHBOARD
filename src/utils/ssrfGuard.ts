/**
 * Pure SSRF Guard & URL Source Inspection Utilities
 * Validates user-supplied URLs and resolved IP addresses before outbound fetches.
 */

export interface UrlValidationResult {
  valid: boolean;
  normalizedUrl?: string;
  hostname?: string;
  reason?: string;
}

const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  'localhost.localdomain',
  'ip6-localhost',
  'ip6-loopback',
  'metadata.google.internal',
  'metadata',
  'instance-data',
]);

function ipv4ToInt(ip: string): number | null {
  const parts = ip.split('.');
  if (parts.length !== 4) return null;
  let result = 0;
  for (const p of parts) {
    if (!/^\d+$/.test(p)) return null;
    const n = Number(p);
    if (n < 0 || n > 255) return null;
    result = (result << 8) | n;
  }
  return result >>> 0;
}

export function isPrivateOrReservedIpv4(ip: string): boolean {
  const intVal = ipv4ToInt(ip);
  if (intVal === null) return false;

  const ranges: [number, number][] = [
    [0x00000000, 0x00ffffff], // 0.0.0.0/8 ("this network")
    [0x0a000000, 0x0affffff], // 10.0.0.0/8 (RFC1918)
    [0x64400000, 0x647fffff], // 100.64.0.0/10 (CGNAT)
    [0x7f000000, 0x7fffffff], // 127.0.0.0/8 (Loopback)
    [0xa9fe0000, 0xa9feffff], // 169.254.0.0/16 (Link-local / AWS/GCP Metadata)
    [0xac100000, 0xac1fffff], // 172.16.0.0/12 (RFC1918)
    [0xc0000000, 0xc00000ff], // 192.0.0.0/24 (IETF Protocol)
    [0xc0000200, 0xc00002ff], // 192.0.2.0/24 (TEST-NET-1)
    [0xc0a80000, 0xc0a8ffff], // 192.168.0.0/16 (RFC1918)
    [0xc6120000, 0xc613ffff], // 198.18.0.0/15 (Benchmarking)
    [0xe0000000, 0xffffffff], // 224.0.0.0/4+ (Multicast / Reserved / Broadcast)
  ];

  return ranges.some(([start, end]) => intVal >= start && intVal <= end);
}

export function isPrivateOrReservedIp(ipRaw: string): boolean {
  const ip = ipRaw.trim().replace(/^\[|\]$/g, '').split('%')[0].toLowerCase();
  if (!ip) return true;

  // Standard IPv4
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(ip)) {
    return isPrivateOrReservedIpv4(ip);
  }

  // IPv6 loopback / unspecified
  if (ip === '::1' || ip === '::' || ip === '0:0:0:0:0:0:0:1' || ip === '0:0:0:0:0:0:0:0') {
    return true;
  }

  // IPv4-mapped IPv6 (e.g. ::ffff:127.0.0.1 or ::ffff:7f00:1)
  if (ip.startsWith('::ffff:')) {
    const suffix = ip.slice('::ffff:'.length);
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(suffix)) {
      return isPrivateOrReservedIpv4(suffix);
    }
    const hexParts = suffix.split(':');
    if (hexParts.length === 2) {
      const hi = parseInt(hexParts[0], 16);
      const lo = parseInt(hexParts[1], 16);
      if (!Number.isNaN(hi) && !Number.isNaN(lo)) {
        const ipv4 = `${(hi >> 8) & 255}.${hi & 255}.${(lo >> 8) & 255}.${lo & 255}`;
        return isPrivateOrReservedIpv4(ipv4);
      }
    }
  }

  // Unique Local Addresses fc00::/7 (fc.. or fd..)
  if (/^f[cd][0-9a-f]{2}:/i.test(ip) || /^f[cd][0-9a-f]{0,2}:/i.test(ip)) {
    return true;
  }

  // Link-local fe80::/10 (fe80..febf)
  if (/^fe[89ab][0-9a-f]:/i.test(ip)) {
    return true;
  }

  return false;
}

export function validateExternalUrl(rawUrl: string): UrlValidationResult {
  const trimmed = (rawUrl || '').trim();
  if (!trimmed) {
    return { valid: false, reason: 'URL sumber data tidak boleh kosong.' };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { valid: false, reason: 'Format URL tidak valid. Gunakan URL lengkap diawali https:// atau http://.' };
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return {
      valid: false,
      reason: `Protokol '${parsed.protocol}' ditolak demi keamanan. Hanya http:// dan https:// yang diizinkan.`,
    };
  }

  if (parsed.username || parsed.password) {
    return {
      valid: false,
      reason: 'URL dengan kredensial inline (user:pass@) ditolak demi keamanan.',
    };
  }

  const host = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (!host) {
    return { valid: false, reason: 'Hostname URL tidak valid.' };
  }

  if (
    BLOCKED_HOSTNAMES.has(host) ||
    host.endsWith('.local') ||
    host.endsWith('.internal') ||
    host.endsWith('.localhost') ||
    host.endsWith('.localdomain')
  ) {
    return {
      valid: false,
      reason: `Akses ke host internal/lokal ('${host}') diblokir oleh kebijakan SSRF Protection.`,
    };
  }

  // Block bare integer or hex IP notations like http://2130706433 or http://0x7f000001
  if (/^\d+$/.test(host) || /^0x[0-9a-f]+$/i.test(host)) {
    return {
      valid: false,
      reason: 'Format IP numerik/heksadesimal tidak diizinkan.',
    };
  }

  // Check explicit IPv4 or IPv6 literal
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.includes(':')) {
    if (isPrivateOrReservedIp(host)) {
      return {
        valid: false,
        reason: `Alamat IP privat/loopback/metadata ('${host}') diblokir oleh kebijakan SSRF Protection.`,
      };
    }
  }

  return {
    valid: true,
    normalizedUrl: parsed.toString(),
    hostname: host,
  };
}

export function detectSourceFormat(
  url: string,
  contentType?: string,
  contentDisposition?: string
): 'csv' | 'xlsx' | 'pdf' | 'docx' | 'json' {
  const ct = (contentType || '').toLowerCase();
  const cd = (contentDisposition || '').toLowerCase();
  const cleanPath = url.split('?')[0].split('#')[0].toLowerCase();

  if (ct.includes('pdf') || cleanPath.endsWith('.pdf') || cd.includes('.pdf')) return 'pdf';
  if (
    ct.includes('spreadsheetml') ||
    ct.includes('ms-excel') ||
    cleanPath.endsWith('.xlsx') ||
    cleanPath.endsWith('.xls') ||
    cd.includes('.xlsx') ||
    cd.includes('.xls')
  ) {
    return 'xlsx';
  }
  if (
    ct.includes('wordprocessingml') ||
    ct.includes('msword') ||
    cleanPath.endsWith('.docx') ||
    cleanPath.endsWith('.doc') ||
    cd.includes('.docx')
  ) {
    return 'docx';
  }
  if (ct.includes('json') || cleanPath.endsWith('.json')) return 'json';
  if (ct.includes('csv') || cleanPath.endsWith('.csv') || cd.includes('.csv')) return 'csv';

  // Google Sheets / export hints
  if (cleanPath.includes('format=csv') || url.toLowerCase().includes('output=csv')) return 'csv';
  if (cleanPath.includes('format=xlsx')) return 'xlsx';

  return 'json';
}
