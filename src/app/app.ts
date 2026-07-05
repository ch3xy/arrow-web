import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  HostListener,
  OnDestroy,
  inject,
  signal,
} from '@angular/core';
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
  readonly contactEmail = environment.contactEmail;
  protected readonly formState = signal<FormState>('idle');
  protected readonly activeSection = signal<string>('');
  protected readonly scrolled = signal(false);
  protected readonly currentYear = new Date().getFullYear();

  private readonly fb = inject(FormBuilder);
  private readonly http = inject(HttpClient);
  private observer?: IntersectionObserver;
  private navObserver?: IntersectionObserver;
  private sectionElements: HTMLElement[] = [];
  private readonly visibleSectionIds = new Set<string>();

  protected readonly contactForm = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(200)]],
    message: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(2000)]],
    // Honeypot gegen Spam-Bots – bleibt für Menschen unsichtbar und unangetastet
    botcheck: [false],
  });

  @HostListener('window:scroll')
  onWindowScroll(): void {
    this.scrolled.set(window.scrollY > 12);
  }

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
      { threshold: 0.3 }
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
      { threshold: 0.2 }
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
    if (this.formState() === 'loading') return; // Re-Entrancy-Guard
    if (this.contactForm.invalid) {
      this.contactForm.markAllAsTouched();
      return;
    }

    this.formState.set('loading');

    try {
      const res = await firstValueFrom(
        this.http.post<{ success: boolean }>('https://api.web3forms.com/submit', {
          access_key: environment.formAccessKey,
          subject: 'Neue Projektanfrage über arrow-solutions.at',
          name: (this.contactForm.value.name ?? '').trim(),
          email: (this.contactForm.value.email ?? '').trim(),
          message: (this.contactForm.value.message ?? '').trim(),
          botcheck: this.contactForm.value.botcheck ?? false,
        }).pipe(timeout(10_000))
      );
      if (!res.success) throw new Error('web3forms rejected');
      this.formState.set('success');
      this.contactForm.reset();
    } catch {
      this.formState.set('error');
    }
  }
}
