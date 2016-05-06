﻿namespace Vidyano.WebComponents {
    "use strict";

    @WebComponent.register({
        properties: {
            error: {
                type: String,
                notify: true
            },
            label: String,
            image: {
                type: String,
                observer: "_imageChanged"
            }
        },
        listeners: {
            "app-route-activate": "_activate"
        }
    })
    export class SignIn extends WebComponent {
        error: string;
        image: string;

        private _activate(e: CustomEvent) {
            const route = <AppRoute>Polymer.dom(this).parentNode;
            const returnUrl = decodeURIComponent(route.parameters.returnUrl || "");

            if (route.app.service.isSignedIn) {
                this.async(() => route.app.redirectToSignOut(), 0);

                e.preventDefault();
                return;
            }

            if (route.app.service.windowsAuthentication) {
                route.app.service.signInUsingCredentials("", "").then(() => route.app.changePath(returnUrl));

                e.preventDefault();
                return;
            }
            else if (route.app.service.providers && Object.keys(route.app.service.providers).length === 1 && !route.app.service.providers["Vidyano"]) {
                this.empty(this.root);

                this.app.service.signInExternal(Object.keys(route.app.service.providers)[0]);
                return;
            }

            this.empty(undefined, c => c instanceof Vidyano.WebComponents.SignInProvider);

            for (const name in route.app.service.providers) {
                const provider = new WebComponents.SignInProvider();
                provider.name = name;

                Polymer.dom(this).appendChild(provider);
            }

            if (this.app.initializationError) {
                this.app.showMessageDialog({
                    title: this.app.label || document.title,
                    message: this.app.initializationError,
                    actions: [ (Vidyano.NoInternetMessage.messages.get(navigator.language.split("-")[0].toLowerCase()) || Vidyano.NoInternetMessage.messages.get("en")).tryAgain ],
                    actionTypes: ["Danger"],
                    noClose: true
                }).then(() => {
                    document.location.reload();
                });
            }
        }

        private _imageChanged() {
            this.$["image"].style.backgroundImage = this.image ? "url(" + this.image + ")" : undefined;
            if (this.image)
                this.$["image"].classList.add("has-image");
            else
                this.$["image"].classList.remove("has-image");
        }
    }

    @WebComponent.register({
        extends: "li",
        properties: {
            label: {
                type: String,
                computed: "_computeLabel(isAttached)",
            },
            description: {
                type: String,
                computed: "_computeDescription(isAttached)",
            },
            isVidyano: {
                type: Boolean,
                computed: "_computeIsVidyano(isAttached)",
                reflectToAttribute: true
            },
            userName: {
                type: String,
                notify: true
            },
            password: {
                type: String,
                notify: true
            },
            staySignedIn: {
                type: Boolean
            },
            expand: {
                type: Boolean,
                readOnly: true,
                reflectToAttribute: true
            },
            signingIn: {
                type: Boolean,
                readOnly: true,
                reflectToAttribute: true,
                value: false
            },
            signingInCounter: {
                type: Number,
                value: 0
            },
            signInLabel: {
                type: String,
                computed: "_computeSigninButtonLabel(signingIn, signingInCounter, isAttached)"
            }
        },
        listeners: {
            "tap": "_tap"
        }
    })
    export class SignInProvider extends WebComponent {
        private _signInButton: HTMLButtonElement;
        private _signInButtonWidth = 0;
        private _signingInMessage: string;
        name: string;
        userName: string;
        password: string;
        staySignedIn: boolean;
        isVidyano: boolean;
        expand: boolean;
        signingIn: boolean;
        signingInCounter: number;

        private _setExpand: (val: boolean) => void;
        private _setSigningIn: (val: boolean) => void;

        private _vidyanoSignInAttached() {
            this.userName = this.app.service.userName !== this.app.service.defaultUserName ? this.app.service.userName : "";
            this.staySignedIn = Vidyano.cookie("staySignedIn", { force: true }) === "true";
            this._autoFocus();
        }

        private _keydown(e: KeyboardEvent) {
            if (e.which === Keyboard.KeyCodes.enter && !StringEx.isNullOrEmpty(this.userName) && !StringEx.isNullOrEmpty(this.password))
                this._signIn();
        }

        private _computeLabel(): string {
            const parameters = this.app.service.providers[this.name];
            if (this.name === "Vidyano" && !parameters.label)
                return "Vidyano";

            return parameters.label;
        }

        private _computeDescription(): string {
            return this.app.service.providers[this.name].description || "";
        }

        private _computeIsVidyano(): boolean {
            return this.name === "Vidyano";
        }

        private _tap() {
            if (!this.isVidyano)
                this.app.service.signInExternal(this.name);
            else if (!this.expand) {
                this._setExpand(true);
                this._autoFocus();
            }
        }

        private _autoFocus() {
            if (StringEx.isNullOrEmpty(this.userName)) {
                const user = <HTMLInputElement><any>this.$$("input#user");
                user.focus();
            }
            else {
                const pass = <HTMLInputElement><any>this.$$("input#pass");
                pass.focus();
            }
        }

        private _signIn() {
            this._setSigningIn(true);

            const password = this.password;
            this.password = "";

            const currentRoute = this.app.currentRoute;
            this.app.service.staySignedIn = this.staySignedIn;
            this.app.service.signInUsingCredentials(this.userName, password).then(() => {
                this._setSigningIn(false);

                if (currentRoute === this.app.currentRoute) {
                    const route = this.findParent<AppRoute>(e => e instanceof Vidyano.WebComponents.AppRoute);
                    this.app.changePath(decodeURIComponent(route.parameters.returnUrl || ""));
                }
            }, e => {
                    this._setSigningIn(false);

                    const pass = <HTMLInputElement><any>this.$$("input#pass");
                    pass.focus();

                    this.app.showMessageDialog({
                        title: this.app.label || document.title,
                        message: e,
                        actions: [ this.translateMessage("OK") ],
                        actionTypes: ["Danger"]
                    });
                });
        }

        private _computeSigninButtonLabel(signingIn: boolean, signingInCounter: number): string {
            if (!signingIn)
                return this.app.service.getTranslatedMessage("SignIn");

            const button = this._signInButton || (this._signInButton = <HTMLButtonElement><any>this.$$("button#signIn"));
            if (!this._signingInMessage) {
                this._signingInMessage = this.app.service.getTranslatedMessage("SigningIn").trimEnd(".").trimEnd(" ") + " ";
                const span = document.createElement("span");
                span.textContent = this._signingInMessage + "...";
                button.appendChild(span);
                button.style.width = span.offsetWidth + "px";
                button.removeChild(span);
            }

            setTimeout(() => {
                if (this.signingInCounter + 1 > 3)
                    this.signingInCounter = 1;
                else
                    this.signingInCounter++;
            }, 500);

            return this._signingInMessage + Array(signingInCounter + 1).join(".");
        }
    }
}