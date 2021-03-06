﻿namespace Vidyano.WebComponents {
    "use strict";

    @WebComponent.register({
        properties: {
            icon: {
                type: String,
                value: "Notification_Error"
            },
            title: String,
            message: String
        }
    })
    export class Error extends WebComponents.WebComponent {
    }
}