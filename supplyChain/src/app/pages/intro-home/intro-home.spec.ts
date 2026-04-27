import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IntroHome } from './intro-home';

describe('IntroHome', () => {
  let component: IntroHome;
  let fixture: ComponentFixture<IntroHome>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IntroHome],
    }).compileComponents();

    fixture = TestBed.createComponent(IntroHome);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
