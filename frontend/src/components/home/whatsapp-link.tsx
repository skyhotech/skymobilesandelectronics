// Adapted from the supplied Stitch homepage reference.
export function WhatsAppLink() {
  return (
    <a
      className="fixed bottom-6 right-6 z-40 bg-[#25D366] text-white p-3.5 rounded-full shadow-[0_12px_24px_-4px_rgba(11,28,72,0.25)] hover:scale-105 transition-transform flex items-center justify-center"
      href="https://wa.me/919842320212"
      rel="noopener noreferrer"
      target="_blank"
      aria-label="Chat with SKY on WhatsApp"
    >
      <span className="material-symbols-outlined text-[28px]" aria-hidden="true">
        {"chat"}
      </span>
    </a>
  );
}
