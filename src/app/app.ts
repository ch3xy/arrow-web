import { AfterViewInit, ChangeDetectionStrategy, Component, OnDestroy, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, timeout } from 'rxjs';
import { environment } from '../environments/environment';

type FormState = 'idle' | 'loading' | 'success' | 'error';

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.scss',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App implements AfterViewInit, OnDestroy {
  protected readonly title = signal('arrow-web');
  readonly contactEmail = environment.contactEmail;
  protected readonly formState = signal<FormState>('idle');
  protected readonly activeSection = signal<string>('');

  private readonly fb = inject(FormBuilder);
  private readonly http = inject(HttpClient);
  private observer?: IntersectionObserver;
  private navObserver?: IntersectionObserver;
  private sectionElements: HTMLElement[] = [];
  private readonly visibleSectionIds = new Set<string>();

  protected readonly contactForm = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    message: ['', [Validators.required, Validators.minLength(10)]],
  });

  ngAfterViewInit(): void {
    // Nav observer runs independently – must not be guarded by revealElements check
    this.sectionElements = Array.from(document.querySelectorAll<HTMLElement>('section[id]'));
    this.navObserver = new IntersectionObserver(
      entries => {
        entries.forEach(e => {
          if (e.isIntersecting) this.visibleSectionIds.add(e.target.id);
          else this.visibleSectionIds.delete(e.target.id);
        });
        // pick topmost visible section in DOM order; clear when none visible
        const topmost = this.sectionElements.find(s => this.visibleSectionIds.has(s.id));
        this.activeSection.set(topmost?.id ?? '');
      },
      { threshold: 0.5 }
    );
    this.sectionElements.forEach(s => this.navObserver?.observe(s));

    const revealElements = Array.from(document.querySelectorAll<HTMLElement>('.reveal'));
    if (!revealElements.length) {
      return;
    }

    this.observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in-view');
          } else {
            entry.target.classList.remove('in-view');
          }
        });
      },
      { threshold: 0.35 }
    );

    revealElements.forEach(el => this.observer?.observe(el));
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    this.navObserver?.disconnect();
  }

  scrollTo(targetId: string): void {
    const el = document.getElementById(targetId);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async submitForm(): Promise<void> {
    if (this.formState() === 'loading') return; // [4] Re-Entrancy-Guard
    if (this.contactForm.invalid) {
      this.contactForm.markAllAsTouched();
      return;
    }

    this.formState.set('loading');

    try {
      const res = await firstValueFrom(
        this.http.post<{ success: boolean }>('https://api.web3forms.com/submit', {
          access_key: environment.formAccessKey,
          name: this.contactForm.value.name ?? '',
          email: this.contactForm.value.email ?? '',
          message: this.contactForm.value.message ?? '',
        }).pipe(timeout(10_000)) // [5] Timeout nach 10 s
      );
      if (!res.success) throw new Error('web3forms rejected'); // [3] Response-Check
      this.formState.set('success');
      this.contactForm.reset();
    } catch {
      this.formState.set('error');
    }
  }
}
