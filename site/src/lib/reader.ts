import { createReader } from '@keystatic/core/reader';
import config from '../../keystatic.config';

const reader = createReader(process.cwd(), config);
export default reader;
