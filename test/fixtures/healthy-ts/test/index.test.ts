import { add } from '../src/index.js';

if (add(1, 2) !== 3) {
  throw new Error('Expected add to sum numbers.');
}
