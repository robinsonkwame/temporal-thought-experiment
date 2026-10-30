import type { ComponentType } from 'react';
import { Step00Start } from './Step00Start';
import { Step01Audit } from './Step01Audit';
import { Step02Rule } from './Step02Rule';
import { Step03Pick } from './Step03Pick';
import { Step04Representation } from './Step04Representation';
import { Step05Instances } from './Step05Instances';
import { Step06Transform } from './Step06Transform';
import { Step07Setup } from './Step07Setup';
import { Step08Settings } from './Step08Settings';
import { Step09Slot } from './Step09Slot';
import { Step10Stage1 } from './Step10Stage1';
import { Step11Stage2 } from './Step11Stage2';
import { Step12Edit } from './Step12Edit';
import { Step13Cutoff } from './Step13Cutoff';
import { Step14Protocol } from './Step14Protocol';

export const STEP_COMPONENTS: ComponentType[] = [
  Step00Start, Step01Audit, Step02Rule, Step03Pick, Step04Representation, Step05Instances, Step06Transform,
  Step07Setup, Step08Settings, Step09Slot, Step10Stage1, Step11Stage2, Step12Edit, Step13Cutoff, Step14Protocol,
];
