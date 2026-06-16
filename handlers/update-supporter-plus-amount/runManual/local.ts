#!/usr/bin/env tsx
import { serveLocally } from '@modules/routing/honoLocalServer';
import { app } from '../src/index';

serveLocally(app, 8787);
