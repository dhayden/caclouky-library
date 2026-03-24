import { TestBed } from '@angular/core/testing';

import { CheckoutsService } from './checkouts.service';

describe('CheckoutsService', () => {
  let service: CheckoutsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CheckoutsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
