import { Response } from 'express';
import { promisify } from 'util';
import { IUnleashConfig } from '../types/option';
import Controller from './controller';
import { IAuthRequest } from './unleash-types';

class LogoutController extends Controller {
    private clearSiteDataOnLogout: boolean;

    private cookieName: string;

    private baseUri: string;

    constructor(config: IUnleashConfig) {
        super(config);
        this.baseUri = config.server.baseUriPath;
        this.clearSiteDataOnLogout = config.session.clearSiteDataOnLogout;
        this.cookieName = config.session.cookieName;
        this.get('/', this.logout);
    }

    async logout(req: IAuthRequest, res: Response): Promise<void> {
        if (req.session) {
            // Allow SSO to register custom logout logic.
            if (req.session.logoutUrl) {
                res.redirect(req.session.logoutUrl);
                return;
            }
        }

        if (req.logout) {
            if (this.isReqLogoutWithoutCallback(req.logout)) {
                // passport < 0.6.0
                req.logout();
            } else {
                // for passport >= 0.6.0, a callback function is expected as first argument.
                // to reuse controller error handling, function is turned into a promise
                const logoutAsyncFn = promisify(req.logout).bind(req);
                await logoutAsyncFn();
            }
        }

        if (req.session) {
            req.session = null;
        }
        res.clearCookie(this.cookieName);

        if (this.clearSiteDataOnLogout) {
            res.set('Clear-Site-Data', '"cookies", "storage"');
        }

        res.redirect(`${this.baseUri}/`);
    }

    private isReqLogoutWithoutCallback(
        logout: IAuthRequest['logout'],
    ): logout is () => void {
        return logout.length === 0;
    }
}

export default LogoutController;
