export interface Email {
  to: string;
  subject: string;
  text: string;
}

export interface Notifier {
  send(email: Email): Promise<void>;
}

// Development notifier: prints emails instead of sending them.
export const consoleNotifier: Notifier = {
  async send(email) {
    console.log(`\n--- email to ${email.to}: ${email.subject}\n${email.text}\n---`);
  },
};
