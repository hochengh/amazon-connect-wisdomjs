/*
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Client as $Client } from './types/client';
import { Command } from './types/command';
import { RequestHandler } from './types/requestHandler';
import { HttpHeaders, HttpResponse } from './types/http';
import { Logger } from './types/logger';
import { ServiceIds } from './types/serviceIds';
import { CallSources } from './types/callSources';

/*
 * The configuration interface of Client class constructor.
 */
export interface ClientConfiguration<HttpHandlerOptions> {
  /*
   * Unique source identifier.
   */
  callSource: CallSources;
  /*
   * The Connect endpoint to use.
   */
  endpoint: string;
  /*
   * Custom headers provided to the HTTP handler.
   */
  headers: HttpHeaders;
  /*
   * The Connect instance url.
   */
  instanceUrl: string;
  /*
   * Logger for logging debug/info/warn/error.
   */
  logger: Logger;
  /*
   * Value for how many times a request will be made at most in case of retry.
   */
  maxAttempts: number;
  /*
   * The HTTP handler to use. Fetch in browser and Https in Nodejs.
   */
  requestHandler: RequestHandler<any, any, HttpHandlerOptions>;
  /*
   * Unique service identifier.
   */
  serviceId: ServiceIds;

  frameWindow?: HTMLIFrameElement;
}

export class Client<
  HandlerOptions,
  ClientInput extends object,
  ClientOutput extends object,
  ClientConfig extends ClientConfiguration<HandlerOptions>
> implements $Client<ClientInput, ClientOutput, ClientConfig> {
  readonly config: ClientConfig;

  constructor(config: ClientConfig) {
    this.config = config;

    window.addEventListener('load', () => {
      if (window.location.origin !== this.config.instanceUrl) {
        this.initFrameConduit();
      }
    });
  }

  initFrameConduit() {
    // Check if Wisdom is already initialized
    const iframe = document.querySelector('iframe[src*="wisdom-v2"]') as HTMLIFrameElement;
    
    if (iframe && iframe.contentWindow) {
      this.config.frameWindow = iframe;
    } else {
      try {
        let container = document.querySelector('wisdom-container');

        if (!container) {
          container = document.createElement('div');
          container.id = 'wisdom-container';
          document.body.appendChild(container);
        }

        (window as any)?.connect?.agentApp.initApp(
          ServiceIds.Wisdom,
          'wisdom-container',
          `${this.config.instanceUrl}/wisdom-v2/`,
          {
            style: 'display: none',
          }
        );
        this.config.frameWindow = document.getElementById(ServiceIds.Wisdom) as HTMLIFrameElement;
      } catch (e) {
        console.error('There was an error initializing Wisdom');
      }
    }
  }

  async call<InputType extends ClientInput, OutputType extends ClientOutput>(
    command: Command<ClientInput, InputType, ClientOutput, OutputType, ClientConfig>,
    options?: HandlerOptions,
  ): Promise<HttpResponse<OutputType>> {
    const handler = command.resolveRequestHandler(this.config, options);
    return handler().then((response: HttpResponse<OutputType>) => response);
  }
}