import Serial from '~/src/communication/serial';
import { FOUR_WAY_COMMANDS, FourWay } from '~/src/communication/four_way';

export const useSerialDisconnect = () => {
    const serialStore = useSerialStore();
    const escStore = useEscStore();
    const { log } = useLogStore();

    return async () => {
        if (!serialStore.deviceHandles.port) {
            return;
        }
        if (serialStore.isFourWay) {
            try {
                FourWay.getInstance().stopKeepAlive();
            } catch (e) {
                console.error(e);
            }
            await FourWay.getInstance().send(FOUR_WAY_COMMANDS.cmd_InterfaceExit);
        }

        Serial.deinit();

        const stream = serialStore.deviceHandles.stream;
        if (stream) {
            try {
                stream.reader?.releaseLock();
                stream.writer?.releaseLock();
                await stream.port.close();
            } catch (e) {
                console.error(e);
            }
        }

        serialStore.$reset();
        escStore.$reset();

        log('Connection to device closed');
    };
};
