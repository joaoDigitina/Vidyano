namespace Vidyano.WebComponents {
    "use strict";

    @WebComponent.register({
        properties: {
            queryId: {
                type: String,
                reflectToAttribute: true
            },
            query: {
                type: Object,
                observer: "_queryChanged"
            },
            loading: {
                type: Boolean,
                readOnly: true,
                value: true,
                reflectToAttribute: true
            },
            error: {
                type: String,
                readOnly: true
            },
            hasError: {
                type: Boolean,
                reflectToAttribute: true,
                computed: "_computeHasError(error)"
            }
        },
        observers: [
            "_updateQuery(queryId, app)",
            "_updateTitle(query.labelWithTotalItems)"
        ],
        listeners: {
            "app-route-activate": "_activate"
        },
        forwardObservers: [
            "query.labelWithTotalItems"
        ]
    })
    export class QueryPresenter extends WebComponent {
        private _customTemplate: PolymerTemplate;
        private _cacheEntry: QueryAppCacheEntry;
        readonly loading: boolean; private _setLoading: (loading: boolean) => void;
        readonly error: string; private _setError: (error: string) => void;
        queryId: string;
        query: Vidyano.Query;

        attached() {
            if (!this._customTemplate)
                this._customTemplate = <PolymerTemplate><any>this.querySelector("template[is='dom-template']");

            super.attached();
        }

        private _activate(e: CustomEvent) {
            const route = <AppRoute>Polymer.dom(this).parentNode;

            this._cacheEntry = <QueryAppCacheEntry>this.app.cache(new QueryAppCacheEntry(route.parameters.id));
            if (this._cacheEntry && this._cacheEntry.query)
                this.query = this._cacheEntry.query;
            else {
                this.queryId = this.query = undefined;
                this.queryId = route.parameters.id;
            }

            this.fire("title-changed", { title: this.query ? this.query.label : null }, { bubbles: true });
        }

        private _computeHasError(error: string): boolean {
            return !StringEx.isNullOrEmpty(error);
        }

        private async _updateQuery(queryId: string, app: Vidyano.WebComponents.App) {
            this._setError(null);

            if ((this.query && queryId && this.query.id.toUpperCase() === queryId.toUpperCase()))
                return;

            if (!this._customTemplate)
                this.empty();

            if (this.queryId) {
                if (this.query)
                    this.query = null;

                try {
                    this._setLoading(true);

                    const query = await app.service.getQuery(this.queryId);
                    if (query.id.toUpperCase() === this.queryId.toUpperCase()) {
                        this._cacheEntry = <QueryAppCacheEntry>this.app.cache(new QueryAppCacheEntry(query.id));
                        this.query = this._cacheEntry.query = query;
                    }
                }
                catch (e) {
                    this._setError(e);
                }
                finally {
                    this._setLoading(false);
                }
            }
            else
                this.query = null;
        }

        private async _queryChanged(query: Vidyano.Query, oldQuery: Vidyano.Query) {
            if (this.isAttached && oldQuery)
                this.empty();

            if (query) {
                if(this.queryId !== query.id)
                    this.queryId = query.id;

                if (!this._customTemplate) {
                    await this.app.importComponent("Query");
                    this._renderQuery(query);
                }
                else
                    Polymer.dom(this).appendChild(this._customTemplate.stamp({ query: query }).root);
            }

            this.fire("title-changed", { title: query ? query.labelWithTotalItems : null }, { bubbles: true });
        }

        private _renderQuery(query: Vidyano.Query) {
            if (query !== this.query)
                return;

            const queryComponent = new Vidyano.WebComponents.Query();
            queryComponent.query = query;
            Polymer.dom(this).appendChild(queryComponent);

            this._setLoading(false);
        }

        private _updateTitle(title: string) {
            this.fire("title-changed", { title: title }, { bubbles: true });
        }
    }
}