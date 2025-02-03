import 'server-only';
import Redis from 'ioredis';
// import env from '@/lib/env';

const redis = new Redis();

export default redis;