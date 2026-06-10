import { TestBed } from '@angular/core/testing';
import { App } from './app';

class MockIntersectionObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
  constructor(_cb: IntersectionObserverCallback, _opts?: IntersectionObserverInit) {}
}
vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render hero headline', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Digitale Lösungen');
  });

  it('should expose contactEmail from environment', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance as unknown as { contactEmail: string };
    expect(app.contactEmail).toBeTruthy();
    expect(app.contactEmail).toContain('@');
  });
});
