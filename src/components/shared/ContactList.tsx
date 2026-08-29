import { AtSign, Globe, Mail, MessageCircle, MonitorPlay, Phone, type LucideIcon } from 'lucide-react'

/**
 * Canais de contato de um lead ou cliente — as duas entidades têm exatamente
 * os mesmos campos, então a lista é a mesma nos dois detalhes.
 */
export interface ContactInfo {
  email: string | null
  phone: string | null
  whatsapp: string | null
  instagram: string | null
  youtube: string | null
  website: string | null
}

/** Sem protocolo o navegador trataria o valor como rota relativa da aplicação. */
function withProtocol(value: string): string {
  return /^https?:\/\//i.test(value) ? value : `https://${value}`
}

/** Só dígitos — `tel:` e `wa.me` não aceitam máscara. */
const digits = (value: string) => value.replace(/\D/g, '')

function ContactRow({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: LucideIcon
  label: string
  value: string
  href?: string
}) {
  return (
    <div className="flex items-center gap-2.5 py-1.5">
      <Icon className="size-3.5 shrink-0 text-ink-faint" />
      <span className="w-20 shrink-0 text-xs text-ink-faint">{label}</span>
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noreferrer noopener"
          className="min-w-0 truncate text-sm text-accent hover:underline"
        >
          {value}
        </a>
      ) : (
        <span className="min-w-0 truncate text-sm text-ink-dim">{value}</span>
      )}
    </div>
  )
}

export function ContactList({ contact }: { contact: ContactInfo }) {
  const rows: { icon: LucideIcon; label: string; value: string; href: string }[] = []

  if (contact.email) {
    rows.push({ icon: Mail, label: 'E-mail', value: contact.email, href: `mailto:${contact.email}` })
  }
  if (contact.phone) {
    rows.push({
      icon: Phone,
      label: 'Telefone',
      value: contact.phone,
      href: `tel:${digits(contact.phone)}`,
    })
  }
  if (contact.whatsapp) {
    rows.push({
      icon: MessageCircle,
      label: 'WhatsApp',
      value: contact.whatsapp,
      href: `https://wa.me/${digits(contact.whatsapp)}`,
    })
  }
  if (contact.instagram) {
    rows.push({
      icon: AtSign,
      label: 'Instagram',
      value: contact.instagram,
      href: `https://instagram.com/${contact.instagram.replace(/^@/, '')}`,
    })
  }
  if (contact.youtube) {
    rows.push({
      icon: MonitorPlay,
      label: 'YouTube',
      value: contact.youtube,
      href: withProtocol(contact.youtube),
    })
  }
  if (contact.website) {
    rows.push({
      icon: Globe,
      label: 'Site',
      value: contact.website,
      href: withProtocol(contact.website),
    })
  }

  if (rows.length === 0) {
    return <p className="py-2 text-sm text-ink-faint">Nenhum canal de contato cadastrado.</p>
  }

  return (
    <div className="divide-y divide-line/60">
      {rows.map((row) => (
        <ContactRow key={row.label} {...row} />
      ))}
    </div>
  )
}
