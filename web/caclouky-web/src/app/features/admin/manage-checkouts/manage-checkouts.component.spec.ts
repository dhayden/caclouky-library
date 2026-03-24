import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ManageCheckoutsComponent } from './manage-checkouts.component';

describe('ManageCheckoutsComponent', () => {
  let component: ManageCheckoutsComponent;
  let fixture: ComponentFixture<ManageCheckoutsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ManageCheckoutsComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ManageCheckoutsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
