/**
 * Zayvora Sovereign Bloom Filter
 * ------------------------------
 * A space-efficient probabilistic data structure used to test whether 
 * an element is a member of a set.
 * 
 * False Positive Rate: Possible
 * False Negative Rate: Impossible (If it says "no", it is definitely "no")
 */

import crypto from 'crypto';

export class BloomFilter {
  /**
   * @param {number} size - Number of bits in the filter
   * @param {number} hashCount - Number of hash functions to use
   */
  constructor(size = 10000, hashCount = 3) {
    this.size = size;
    this.hashCount = hashCount;
    this.bitArray = new Uint8Array(Math.ceil(size / 8));
  }

  _getHashes(val) {
    const hashes = [];
    const h1 = crypto.createHash('md5').update(val).digest().readInt32BE(0);
    const h2 = crypto.createHash('sha1').update(val).digest().readInt32BE(0);
    
    for (let i = 0; i < this.hashCount; i++) {
      // Double hashing technique: h(i) = (h1 + i * h2) % size
      const hash = Math.abs((h1 + i * h2) % this.size);
      hashes.append(hash);
    }
    return hashes;
  }

  // Fixing the append/push mistake in JS
  _getHashesFixed(val) {
    const hashes = [];
    const h1 = crypto.createHash('md5').update(val).digest().readUInt32BE(0);
    const h2 = crypto.createHash('sha1').update(val).digest().readUInt32BE(0);
    
    for (let i = 0; i < this.hashCount; i++) {
      const hash = (h1 + i * h2) % this.size;
      hashes.push(hash);
    }
    return hashes;
  }

  add(val) {
    const hashes = this._getHashesFixed(val);
    hashes.forEach(h => {
      const byteIdx = Math.floor(h / 8);
      const bitIdx = h % 8;
      this.bitArray[byteIdx] |= (1 << bitIdx);
    });
  }

  has(val) {
    const hashes = this._getHashesFixed(val);
    return hashes.every(h => {
      const byteIdx = Math.floor(h / 8);
      const bitIdx = h % 8;
      return (this.bitArray[byteIdx] & (1 << bitIdx)) !== 0;
    });
  }

  /**
   * Export the filter state as a base64 string
   */
  export() {
    return Buffer.from(this.bitArray).toString('base64');
  }

  /**
   * Import filter state from a base64 string
   */
  import(data) {
    this.bitArray = new Uint8Array(Buffer.from(data, 'base64'));
  }
}

// Global instance for the gateway
export const routeFilter = new BloomFilter(20000, 4);

// Pre-populate with known valid static routes from server.js
const VALID_ROUTES = [
  '/', '/workspace', '/zayvora', '/join', 
  '/api/auth', '/api/ping', '/health',
  '/workspace.html', '/zayvora.html', '/join.html',
  '/favicon.ico'
];

VALID_ROUTES.forEach(r => routeFilter.add(r));
