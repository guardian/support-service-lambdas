#!/usr/bin/env -S STAGE=CODE pnpm exec tsx
import { serveLocally } from '@modules/routing/honoLocalServer';
import { app } from '../src/index';

/*
To use this, run this file as a script, you can click the green triangle in intellij
 */

serveLocally(app, 8787);
