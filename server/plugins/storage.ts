import redisDriver from 'unstorage/drivers/redis';
import memoryDriver from 'unstorage/drivers/memory';

export default defineNitroPlugin(() => {
    const storage = useStorage();

    const cfg = useRuntimeConfig();
    const redisHost = cfg.redis?.host;
    const redisPort = cfg.redis?.port ?? 6379;

    // If REDIS_HOST is not configured, fall back to in-memory storage for dev.
    const makeRedisOrMemory = (db: number, base = 'redis') => {
        if (!redisHost) {
            return memoryDriver();
        }
        return redisDriver({ base, host: redisHost, port: redisPort, db });
    };

    const tools = makeRedisOrMemory(0);
    const releases = makeRedisOrMemory(1);
    const bootloaders = makeRedisOrMemory(2);
    const binaries = makeRedisOrMemory(3);
    const schema = makeRedisOrMemory(4);

    storage.mount('tools', tools);
    storage.mount('releases', releases);
    storage.mount('bootloaders', bootloaders);
    storage.mount('binaries', binaries);
    storage.mount('schema', schema);
});
