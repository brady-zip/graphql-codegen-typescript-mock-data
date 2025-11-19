"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupFunctionTokens = exports.setupMockValueGenerator = void 0;
const tslib_1 = require("tslib");
const allFakerLocales = tslib_1.__importStar(require("@faker-js/faker"));
const casual_1 = tslib_1.__importDefault(require("casual"));
class CasualMockValueGenerator {
    constructor(opts) {
        this.word = () => (this.dynamicValues ? `casual.word` : `'${casual_1.default.word}'`);
        this.uuid = () => (this.dynamicValues ? `casual.uuid` : `'${casual_1.default.uuid}'`);
        this.boolean = () => (this.dynamicValues ? `casual.boolean` : casual_1.default.boolean);
        this.integer = () => (this.dynamicValues ? `casual.integer(0, 9999)` : `${casual_1.default.integer(0, 9999)}`);
        this.float = () => this.dynamicValues
            ? `Math.round(casual.double(0, 10) * 100) / 100`
            : `${Math.round(casual_1.default.double(0, 10) * 100) / 100}`;
        this.date = () => this.dynamicValues
            ? `new Date(casual.unix_time).toISOString()`
            : `'${new Date(casual_1.default.unix_time).toISOString()}'`;
        this.seed = (seed) => casual_1.default.seed(seed);
        this.dynamicValues = opts.dynamicValues;
    }
}
const casualFunctionTokens = {
    import: `import casual from 'casual';`,
    seed: 'casual.seed(0);',
    seedFunction: 'export const seedMocks = (seed: number) => casual.seed(seed);',
};
class FakerMockValueGenerator {
    constructor(opts) {
        this.word = () => (this.dynamicValues ? `faker.lorem.word()` : `'${this.fakerInstance.lorem.word()}'`);
        this.uuid = () => (this.dynamicValues ? `faker.string.uuid()` : `'${this.fakerInstance.string.uuid()}'`);
        this.boolean = () => (this.dynamicValues ? `faker.datatype.boolean()` : this.fakerInstance.datatype.boolean());
        this.integer = () => this.dynamicValues
            ? `faker.number.int({ min: 0, max: 9999 })`
            : this.fakerInstance.number.int({ min: 0, max: 9999 });
        this.float = () => this.dynamicValues
            ? `faker.number.float({ min: 0, max: 10, fractionDigits: 1 })`
            : this.fakerInstance.number.float({ min: 0, max: 10, fractionDigits: 1 });
        this.date = () => this.dynamicValues
            ? `faker.date.past({ years: 1, refDate: new Date(2022, 0) }).toISOString()`
            : `'${this.fakerInstance.date.past({ years: 1, refDate: new Date(2022, 0) }).toISOString()}'`;
        this.seed = (seed) => this.fakerInstance.seed(seed);
        this.dynamicValues = opts.dynamicValues;
        const fakerImport = `faker${opts.generatorLocale.toUpperCase()}`;
        if (!(fakerImport in allFakerLocales)) {
            throw new Error(`Cannot find faker version for locale ${opts.generatorLocale.toUpperCase()}`);
        }
        this.fakerInstance = allFakerLocales[`faker${opts.generatorLocale.toUpperCase()}`];
    }
}
function getFakerFunctionTokens(locale = 'en') {
    return {
        import: `import { faker${locale.toUpperCase()} as faker } from '@faker-js/faker';`,
        seed: 'faker.seed(0);',
        seedFunction: 'export const seedMocks = (seed: number) => faker.seed(seed);',
    };
}
const setupMockValueGenerator = ({ generateLibrary, dynamicValues, generatorLocale, }) => {
    switch (generateLibrary) {
        case 'casual':
            return new CasualMockValueGenerator({ dynamicValues, generatorLocale });
        case 'faker':
            return new FakerMockValueGenerator({ dynamicValues, generatorLocale });
    }
};
exports.setupMockValueGenerator = setupMockValueGenerator;
const setupFunctionTokens = (generateLibrary, locale) => {
    switch (generateLibrary) {
        case 'casual':
            return casualFunctionTokens;
        case 'faker':
            return getFakerFunctionTokens(locale);
    }
};
exports.setupFunctionTokens = setupFunctionTokens;
//# sourceMappingURL=mockValueGenerator.js.map