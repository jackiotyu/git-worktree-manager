import logger from '@/core/log/logger';

export const toggleLogCmd = () => {
    logger.toggle();
};
