// Conteúdo infantil curado: respostas simples, histórias curtas e cenas ilustradas.
// As explicações seguem a FAQ da OBPAZ, reescritas para crianças de ~6 a 11 anos.
// Personagens fixos das histórias: Lia, Davi, Tom e a professora Rosa.

// Cenas disponíveis (desenhadas em public/illustrations.js). A descrição orienta o modelo de linguagem.
export const SCENES = {
  pomba_paz: "pomba branca voando com um raminho no céu (ideia de paz)",
  amigos_conversando: "duas crianças conversando com calma, balões de fala",
  briga: "duas crianças bravas uma com a outra, nuvem de briga",
  raiva: "criança muito brava, com uma nuvem vermelha em cima da cabeça",
  respirar_calma: "criança de olhos fechados respirando fundo, calma",
  pedir_ajuda: "criança contando algo para a professora (adulto de confiança)",
  sozinho: "criança triste sentada sozinha num banco",
  inclusao: "crianças chamando outra criança para brincar junto",
  mediacao: "uma criança ajudando duas amigas a conversarem",
  desculpas: "criança pedindo desculpas e a outra aceitando, coração",
  roda_diversidade: "roda de crianças diferentes de mãos dadas",
  cooperacao: "crianças montando juntas uma torre de blocos",
  direitos: "criança com casa, comida, livro e coração (vida digna)",
  ideia: "criança pensando, com uma lâmpada de ideia",
  escola: "escola com crianças felizes no pátio"
};

export const KID_ENTRIES = [
  {
    id: "paz",
    questions: ["O que é paz?", "o que significa paz", "pra que serve a paz"],
    answer:
      "Paz é quando as pessoas convivem com respeito, cuidado e sem machucar ninguém. Mas paz não é só \"não ter briga\": é quando todo mundo se sente seguro, é ouvido e é tratado com carinho e justiça.",
    story: {
      title: "A pomba da sala",
      panels: [
        { scene: "briga", caption: "Na sala da professora Rosa, Lia e Davi brigavam por causa do lápis de cor azul." },
        { scene: "amigos_conversando", caption: "Eles pararam, respiraram e combinaram: cada um usa o azul um pouquinho." },
        { scene: "pomba_paz", caption: "A turma desenhou uma pomba no quadro para lembrar: paz é cuidar uns dos outros!" }
      ]
    },
    tip: "Paz começa em atitudes pequenas: ouvir, dividir e tratar todo mundo com respeito.",
    question: "Qual atitude sua deixa a sua sala mais tranquila?"
  },
  {
    id: "cultura-de-paz",
    questions: ["O que é cultura de paz?", "o que e cultura da paz", "cultura de paz para criança"],
    answer:
      "Cultura de paz é quando a paz vira um jeito de viver de todo mundo, todos os dias. É conversar em vez de brigar, respeitar as diferenças, ajudar quem precisa e resolver os problemas sem machucar ninguém.",
    story: {
      title: "O combinado da turma",
      panels: [
        { scene: "escola", caption: "Na escola da Lia, a turma resolveu criar combinados para conviver melhor." },
        { scene: "roda_diversidade", caption: "Todo mundo deu ideias: ouvir sem interromper, chamar todos para brincar e não xingar." },
        { scene: "cooperacao", caption: "Com o tempo, cuidar uns dos outros virou costume. Isso é cultura de paz!" }
      ]
    },
    tip: "Quando um gesto de cuidado vira costume, ele vira cultura de paz.",
    question: "Que combinado você colocaria na sua sala?"
  },
  {
    id: "paz-positiva",
    questions: ["paz positiva e paz negativa", "diferença entre paz positiva e negativa", "o que é paz negativa", "o que é paz positiva"],
    answer:
      "Existem dois tipos de paz. A paz negativa é quando a briga para. A paz positiva é ainda melhor: é quando a gente resolve o motivo da briga e todo mundo passa a ter o que precisa para viver bem e ser respeitado.",
    story: {
      title: "O balanço do parquinho",
      panels: [
        { scene: "briga", caption: "Todo recreio, Tom e Davi brigavam pelo único balanço do parquinho." },
        { scene: "pedir_ajuda", caption: "A professora Rosa separou os dois. A briga parou... mas o problema continuava. Isso é paz negativa." },
        { scene: "cooperacao", caption: "Então a turma criou uma fila com a vez de cada um. Agora todos brincam! Isso é paz positiva." }
      ]
    },
    tip: "Parar a briga é bom. Resolver o motivo da briga é melhor ainda!",
    question: "Você lembra de um problema que foi resolvido de verdade?"
  },
  {
    id: "conflito",
    questions: ["por que as pessoas brigam", "o que é conflito", "por que existem conflitos", "é possível nunca brigar"],
    answer:
      "Conflito é quando as pessoas querem ou pensam coisas diferentes. Isso é normal e acontece com todo mundo! O importante é não transformar o conflito em violência: dá pra conversar, ouvir o outro e achar uma solução boa para os dois.",
    story: {
      title: "Futebol ou pega-pega?",
      panels: [
        { scene: "briga", caption: "Lia queria jogar futebol. Davi queria pega-pega. Os dois ficaram bravos." },
        { scene: "ideia", caption: "Então Lia teve uma ideia: \"E se a gente fizer metade do recreio de cada?\"" },
        { scene: "inclusao", caption: "Deu certo! Pensar diferente não precisa virar briga." }
      ]
    },
    tip: "Quando discordar, pergunte: \"O que você precisa?\" e conte o que você precisa.",
    question: "Que solução você inventaria se fosse a Lia?"
  },
  {
    id: "raiva",
    questions: ["como controlar a raiva", "estou com raiva", "fico muito bravo", "como me acalmar", "por que estou irritado"],
    answer:
      "Sentir raiva é normal, todo mundo sente! O que importa é o que a gente faz com ela. Antes de falar ou fazer alguma coisa, pare, respire fundo bem devagar e conte até dez. Depois, diga o que está sentindo, sem machucar ninguém.",
    story: {
      title: "O vulcão do Tom",
      panels: [
        { scene: "raiva", caption: "Tom perdeu no jogo e sentiu um vulcão de raiva crescendo dentro dele." },
        { scene: "respirar_calma", caption: "Ele lembrou da dica: cheirar a flor (puxar o ar) e soprar a vela (soltar o ar) três vezes." },
        { scene: "amigos_conversando", caption: "Mais calmo, ele disse: \"Fiquei chateado de perder, mas quero jogar de novo!\"" }
      ]
    },
    tip: "Cheire a flor 🌸, sopre a vela 🕯️. Repita três vezes!",
    question: "O que ajuda você a se acalmar quando fica bravo?"
  },
  {
    id: "briguei",
    questions: ["briguei com meu amigo", "briguei com um colega o que faço", "meu amigo ficou bravo comigo", "como fazer as pazes"],
    answer:
      "Primeiro, espere a raiva passar um pouquinho. Depois, chame seu amigo para conversar. Conte como você se sentiu e escute o lado dele também. Se você errou em alguma coisa, peça desculpas. Juntos vocês podem combinar um jeito de não brigar de novo.",
    story: {
      title: "As pazes da Lia e do Davi",
      panels: [
        { scene: "briga", caption: "Lia e Davi brigaram porque um derrubou o desenho do outro." },
        { scene: "respirar_calma", caption: "No outro dia, já mais calma, Lia pensou no que tinha acontecido." },
        { scene: "desculpas", caption: "\"Desculpa por ter gritado. Vamos fazer outro desenho juntos?\" E Davi aceitou!" }
      ]
    },
    tip: "Uma boa frase para começar: \"Posso ouvir o seu lado e contar o meu?\"",
    question: "Como você gosta que alguém faça as pazes com você?"
  },
  {
    id: "bullying",
    questions: ["estou sofrendo bullying", "o que é bullying", "estão rindo de mim", "me xingam na escola", "fazem bullying comigo"],
    answer:
      "Bullying é quando alguém machuca, xinga, zomba ou deixa outra pessoa de fora várias vezes, de propósito. Isso não é brincadeira e não é culpa de quem sofre! Se acontecer com você ou com alguém, conte para um adulto de confiança: a professora, a diretora, sua família.",
    story: {
      title: "A coragem do Davi",
      panels: [
        { scene: "sozinho", caption: "Todo dia, uns colegas riam do Davi no recreio. Ele ficava triste e sozinho." },
        { scene: "pedir_ajuda", caption: "Um dia, Davi teve coragem e contou tudo para a professora Rosa." },
        { scene: "roda_diversidade", caption: "A escola conversou com a turma, e o Davi ganhou novos amigos. Pedir ajuda foi muito corajoso!" }
      ]
    },
    tip: "Contar para um adulto não é fofoca: é proteção!",
    question: "Quem é um adulto em quem você confia na sua escola?"
  },
  {
    id: "exclusao",
    questions: [
      "como ajudar alguém excluído", "ninguém brinca comigo", "meu amigo não quer brincar comigo", "me deixam de fora",
      "meu colega fica sozinho", "como incluir um amigo", "não tenho amigos no recreio"
    ],
    answer:
      "Quando alguém fica sozinho, um gesto pequeno pode mudar o dia dessa pessoa! Você pode chamar para brincar, sentar junto no lanche ou perguntar \"quer fazer dupla comigo?\". Se alguém estiver sendo maltratado, avise um adulto.",
    story: {
      title: "O convite da Lia",
      panels: [
        { scene: "sozinho", caption: "O Tom era novo na escola e ficava sozinho no banco durante o recreio." },
        { scene: "inclusao", caption: "A Lia foi até ele: \"Quer brincar com a gente?\"" },
        { scene: "roda_diversidade", caption: "Hoje o Tom é amigo de toda a turma. Um convite fez toda a diferença!" }
      ]
    },
    tip: "Olhe ao redor no recreio: tem alguém sozinho? Que tal chamar?",
    question: "Como você se sentiria se alguém te chamasse para brincar?"
  },
  {
    id: "diferencas",
    questions: ["como respeitar as diferenças", "respeitar opiniões diferentes", "por que as pessoas são diferentes", "o que é diversidade"],
    answer:
      "Cada pessoa é de um jeito: tem cor de pele, cabelo, corpo, família e jeitos de pensar diferentes. E é isso que deixa o mundo mais bonito! Respeitar é tratar todo mundo bem, mesmo quando a pessoa pensa diferente de você.",
    story: {
      title: "A roda colorida",
      panels: [
        { scene: "escola", caption: "Na turma da professora Rosa, cada criança é diferente da outra." },
        { scene: "amigos_conversando", caption: "Lia ama futebol, Davi ama desenhar, Tom ama dinossauros. Eles contam suas coisas favoritas uns para os outros." },
        { scene: "roda_diversidade", caption: "Juntos, eles descobriram que as diferenças tornam a turma mais divertida!" }
      ]
    },
    tip: "Dá pra discordar sem desrespeitar: \"Eu penso diferente, porque...\"",
    question: "O que você tem de especial que é diferente dos seus amigos?"
  },
  {
    id: "desculpas",
    questions: ["como pedir desculpas", "devo pedir desculpa", "pedir desculpas mesmo sem ter culpa"],
    answer:
      "Pedir desculpas mostra que você se importa com o outro. Não precisa ser perfeito: olhe para a pessoa, diga o que você fez e que sente muito, e pergunte como pode ajudar a melhorar a situação.",
    story: {
      title: "O desenho rasgado",
      panels: [
        { scene: "briga", caption: "Sem querer, o Tom rasgou o desenho do Davi. O Davi ficou muito triste." },
        { scene: "desculpas", caption: "Tom disse: \"Desculpa, eu não tive cuidado. Posso te ajudar a fazer outro?\"" },
        { scene: "cooperacao", caption: "Os dois fizeram um desenho ainda mais bonito, juntos!" }
      ]
    },
    tip: "Desculpas de verdade = dizer o que fez + sentir muito + ajudar a consertar.",
    question: "Já aconteceu de alguém te pedir desculpas? Como foi?"
  },
  {
    id: "falar-sem-magoar",
    questions: ["como falar algo difícil sem magoar", "como falar o que sinto", "como reclamar sem brigar", "comunicação não violenta"],
    answer:
      "Quando algo te incomoda, dá pra falar sem atacar. Fale do que aconteceu, diga como você se sentiu e peça o que você precisa. Assim a outra pessoa entende e fica mais fácil resolver.",
    story: {
      title: "A fila da Lia",
      panels: [
        { scene: "raiva", caption: "O Davi furou a fila do bebedouro na frente da Lia. Ela ficou chateada." },
        { scene: "amigos_conversando", caption: "Em vez de gritar, ela disse: \"Quando você furou a fila, eu fiquei chateada. Você pode ir pro final?\"" },
        { scene: "desculpas", caption: "O Davi entendeu e foi pro final da fila. Problema resolvido sem briga!" }
      ]
    },
    tip: "Use a frase mágica: \"Quando você..., eu me senti... Você pode...?\"",
    question: "Que frase você poderia usar quando algo te incomodar?"
  },
  {
    id: "mediacao",
    questions: ["como ajudar dois amigos que brigaram", "como ajudar duas pessoas que brigaram", "o que é mediação", "meus amigos brigaram"],
    answer:
      "Quando dois amigos brigam, você pode ajudar sem escolher um lado. Peça para cada um falar na sua vez, sem xingar. Pergunte o que aconteceu, como cada um se sentiu e o que eles precisam. Depois, ajude a encontrar uma ideia boa para os dois. Se a briga for séria, chame um adulto.",
    story: {
      title: "A ponte do Tom",
      panels: [
        { scene: "briga", caption: "Lia e Davi brigavam por causa de uma bola." },
        { scene: "mediacao", caption: "O Tom chegou: \"Um fala de cada vez. Lia, o que aconteceu? Agora você, Davi.\"" },
        { scene: "amigos_conversando", caption: "Ouvindo um ao outro, eles decidiram jogar juntos. O Tom foi uma ponte de paz!" }
      ]
    },
    tip: "Quem ajuda na conversa não escolhe lado: ajuda os dois a se ouvirem.",
    question: "Você já ajudou amigos a fazer as pazes?"
  },
  {
    id: "direitos",
    questions: ["o que são direitos humanos", "qual a relação entre paz e direitos humanos", "o que é dignidade", "direitos das crianças"],
    answer:
      "Direitos humanos são coisas que toda pessoa precisa ter para viver bem, só por ser gente: casa, comida, escola, saúde, carinho, segurança e ser tratada com respeito. Não existe paz de verdade quando alguém fica sem essas coisas.",
    story: {
      title: "A caixa de cuidados",
      panels: [
        { scene: "ideia", caption: "A professora Rosa perguntou: \"Do que toda criança precisa para viver bem?\"" },
        { scene: "direitos", caption: "A turma respondeu: casa, comida, escola, saúde, brincar e carinho!" },
        { scene: "roda_diversidade", caption: "\"Isso mesmo! E todas as pessoas têm esses direitos. Cuidar disso também é fazer paz.\"" }
      ]
    },
    tip: "Toda pessoa merece respeito, em qualquer lugar.",
    question: "Qual direito você acha mais importante para uma criança?"
  },
  {
    id: "violencia",
    questions: ["o que é violência", "tipos de violência", "violência direta estrutural e cultural", "o que é violência estrutural"],
    answer:
      "Violência é tudo o que machuca as pessoas. Tem a violência que a gente vê, como bater e xingar. Tem a violência escondida, quando algumas pessoas não têm o que precisam para viver bem, como comida ou escola. E tem as ideias que fazem a violência parecer normal, como \"menina não pode jogar bola\".",
    story: {
      title: "Os três tipos de machucado",
      panels: [
        { scene: "briga", caption: "Bater, empurrar e xingar é a violência que dá pra ver." },
        { scene: "direitos", caption: "Quando uma criança não tem escola ou comida, isso também machuca, mesmo sem ninguém bater." },
        { scene: "roda_diversidade", caption: "E dizer \"isso não é coisa de menina\" é uma ideia que exclui. Juntos, podemos mudar isso!" }
      ]
    },
    tip: "Se alguém estiver machucando você ou outra pessoa, conte para um adulto de confiança.",
    question: "Que ideia você acha que precisa mudar para todo mundo ser respeitado?"
  },
  {
    id: "sozinho",
    questions: ["estou me sentindo sozinho", "estou triste", "ninguém me entende", "me sinto sozinha"],
    answer:
      "Sinto muito que você esteja se sentindo assim. 💛 Todo mundo se sente triste ou sozinho às vezes, e não tem problema nenhum nisso. Conte para alguém de confiança — sua família, sua professora ou um amigo — o que você está sentindo. Falar ajuda o coração a ficar mais leve.",
    story: {
      title: "O banco do recreio",
      panels: [
        { scene: "sozinho", caption: "A Lia estava triste e sentou sozinha no banco." },
        { scene: "pedir_ajuda", caption: "Ela contou para a professora Rosa como estava se sentindo." },
        { scene: "inclusao", caption: "A professora escutou com carinho, e logo os amigos chamaram a Lia para brincar." }
      ]
    },
    tip: "Falar sobre o que sente é coisa de gente corajosa!",
    question: "Com quem você gosta de conversar quando está triste?"
  },
  {
    id: "galtung",
    questions: ["quem foi Johan Galtung", "quem é galtung"],
    answer:
      "Johan Galtung foi um pesquisador que passou a vida estudando a paz. Ele ensinou que paz não é só a briga parar: é quando todas as pessoas vivem com justiça, respeito e o que precisam para viver bem.",
    story: {
      title: "O estudioso da paz",
      panels: [
        { scene: "ideia", caption: "Galtung se perguntava: \"Paz é só não ter guerra?\"" },
        { scene: "direitos", caption: "Ele percebeu que as pessoas também sofrem quando não têm comida, escola ou respeito." },
        { scene: "pomba_paz", caption: "Por isso ele dizia: paz de verdade é cuidar de tudo isso também!" }
      ]
    },
    tip: "Paz é maior do que parar uma briga!",
    question: "Para você, o que deixa um lugar em paz?"
  },
  {
    id: "escola",
    questions: ["como fazer paz na escola", "como a escola pode promover a paz", "como praticar a paz no dia a dia", "como ser uma pessoa de paz"],
    answer:
      "Dá pra fazer paz na escola todos os dias! Ouvir os colegas, chamar quem está sozinho, conversar em vez de brigar, ajudar quem precisa e não rir de ninguém. Quando muita gente faz isso junto, a escola inteira fica melhor.",
    story: {
      title: "A missão da turma",
      panels: [
        { scene: "escola", caption: "A turma da professora Rosa aceitou uma missão: espalhar paz pela escola!" },
        { scene: "cooperacao", caption: "Eles ajudaram os menores, dividiram o lanche e fizeram cartazes de respeito." },
        { scene: "pomba_paz", caption: "No fim do mês, toda a escola estava participando. Paz é contagiante!" }
      ]
    },
    tip: "Escolha uma atitude de paz para fazer amanhã na escola!",
    question: "Qual seria a sua missão de paz?"
  }
];
