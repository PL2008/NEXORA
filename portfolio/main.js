// NEXORA — portfólio. Criado Por Pedro Lucas!
;(function () {
  'use strict'
  document.documentElement.classList.add('js')

  // Barra de navegação com fundo ao rolar.
  var nav = document.querySelector('[data-nav]')
  var onScroll = function () {
    if (nav) nav.classList.toggle('is-scrolled', window.scrollY > 8)
  }
  window.addEventListener('scroll', onScroll, { passive: true })
  onScroll()

  // Menu do celular.
  var toggle = document.querySelector('[data-menu-toggle]')
  var menu = document.querySelector('[data-menu]')
  function setMenu(open) {
    if (!toggle || !menu) return
    toggle.setAttribute('aria-expanded', String(open))
    toggle.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu')
    menu.classList.toggle('is-open', open)
  }
  if (toggle && menu) {
    toggle.addEventListener('click', function () {
      setMenu(toggle.getAttribute('aria-expanded') !== 'true')
    })
    menu.addEventListener('click', function (e) {
      if (e.target.closest('a')) setMenu(false)
    })
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') setMenu(false)
    })
    document.addEventListener('click', function (e) {
      if (!menu.contains(e.target) && !toggle.contains(e.target)) setMenu(false)
    })
  }

  // Elementos aparecem suavemente ao entrar na tela.
  var items = document.querySelectorAll('.reveal')
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible')
            io.unobserve(entry.target)
          }
        })
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
    )
    items.forEach(function (el) {
      io.observe(el)
    })
  } else {
    items.forEach(function (el) {
      el.classList.add('is-visible')
    })
  }

  // Abas das telas do projeto (teclado: setas, Home, End).
  document.querySelectorAll('[data-tabs]').forEach(function (list) {
    var tabs = Array.prototype.slice.call(list.querySelectorAll('[role=tab]'))
    function select(tab) {
      tabs.forEach(function (t) {
        var selected = t === tab
        t.setAttribute('aria-selected', String(selected))
        t.tabIndex = selected ? 0 : -1
        var panel = document.getElementById(t.getAttribute('aria-controls'))
        if (panel) {
          panel.hidden = !selected
          panel.classList.toggle('is-active', selected)
        }
      })
    }
    tabs.forEach(function (tab, i) {
      tab.addEventListener('click', function () {
        select(tab)
      })
      tab.addEventListener('keydown', function (e) {
        var next = null
        if (e.key === 'ArrowRight') next = tabs[(i + 1) % tabs.length]
        else if (e.key === 'ArrowLeft') next = tabs[(i - 1 + tabs.length) % tabs.length]
        else if (e.key === 'Home') next = tabs[0]
        else if (e.key === 'End') next = tabs[tabs.length - 1]
        if (next) {
          e.preventDefault()
          select(next)
          next.focus()
        }
      })
    })
  })

  // Formulário de contato: monta o e-mail no aplicativo de e-mail do visitante.
  var form = document.querySelector('[data-contact]')
  if (form) {
    var error = form.querySelector('[data-form-error]')
    form.addEventListener('submit', function (e) {
      e.preventDefault()
      var nome = form.nome.value.trim()
      var tipo = form.tipo.value
      var mensagem = form.mensagem.value.trim()
      form.nome.setAttribute('aria-invalid', String(!nome))
      form.mensagem.setAttribute('aria-invalid', String(!mensagem))
      if (!nome || !mensagem) {
        if (error) error.hidden = false
        ;(!nome ? form.nome : form.mensagem).focus()
        return
      }
      if (error) error.hidden = true
      var subject = 'Novo projeto — ' + tipo
      var body = 'Olá, NEXORA!\n\nMeu nome é ' + nome + '.\nTipo de projeto: ' + tipo + '\n\n' + mensagem
      window.location.href =
        'mailto:comprarumpc3@gmail.com?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body)
    })
  }

  var year = document.querySelector('[data-year]')
  if (year) year.textContent = String(new Date().getFullYear())
})()
