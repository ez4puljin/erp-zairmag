declare const _default: () => {
    port: number;
    database: {
        url: string;
    };
    jwt: {
        secret: string;
        refreshSecret: string;
        expiration: string;
        refreshExpiration: string;
    };
};
export default _default;
