// Static schematic silhouettes. Variations share a pattern illustration.
export function MovementDiagram({visual,title}:{visual:string;title:string}){
 const pose:Record<string,{head:number[];body:string;support?:string}>={
  wall:{head:[63,31],body:'M63 43 L56 72 L40 105 M56 72 L70 105 M62 49 L91 52 L105 44',support:'M107 20 V111'},
  incline:{head:[67,42],body:'M61 52 L46 76 L24 99 M46 76 L40 103 M62 54 L87 76 L104 77',support:'M99 80 H120 V108 M104 80 V108'},
  push:{head:[97,61],body:'M86 65 L59 73 L28 88 M59 73 L37 92 M84 66 L93 94 L108 94'},
  row:{head:[76,64],body:'M69 73 L53 88 L27 104 M53 88 L44 106 M72 73 L89 52 L89 34',support:'M40 32 H111 M45 32 V107 M108 32 V107'},
  back:{head:[101,77],body:'M90 83 L63 89 L28 78 M63 89 L31 99 M85 83 L104 60 M85 83 L113 88'},
  hang:{head:[73,42],body:'M73 53 V80 M73 80 L58 104 M73 80 L88 104 M73 58 L52 43 V24 M73 58 L96 43 V24',support:'M36 22 H111'},
  squat:{head:[76,31],body:'M75 43 L60 68 L86 83 L72 105 M60 68 L44 88 L55 106 M73 49 L45 49 L30 59'},
  lunge:{head:[75,29],body:'M75 41 L69 68 L44 78 L40 104 M69 68 L96 90 L111 92 M74 48 L52 61 L35 61'},
  pistol:{head:[75,31],body:'M73 43 L60 69 L80 85 L72 106 M60 69 L31 91 L13 91 M70 50 L47 51 L29 60'},
  plank:{head:[100,65],body:'M90 69 L59 77 L33 88 M59 77 L39 95 M86 70 L89 95 L106 95'},
  hollow:{head:[103,70],body:'M94 80 L75 94 L52 94 L27 76 M52 94 L27 87 M92 82 L110 61'},
  raise:{head:[110,86],body:'M100 94 L66 97 L44 75 L42 40 M66 97 L54 73 L55 40 M96 95 L111 104'},
  sit:{head:[75,33],body:'M75 45 L71 80 L34 79 L16 78 M71 80 L37 89 L18 87 M76 51 L88 87 L97 94',support:'M60 97 H107'},
 };
 const figure=pose[visual]??pose.push;
 return <svg className="movement-diagram" viewBox="0 0 145 125" role="img" aria-label={`${title} · schematic movement illustration`}><path d="M12 110 H132" stroke="#d9e4ce" strokeWidth="2"/><g fill="none" strokeLinecap="round" strokeLinejoin="round">{figure.support&&<path d={figure.support} stroke="#a5b994" strokeWidth="3"/>}<circle cx={figure.head[0]} cy={figure.head[1]} r="9" stroke="#78965e" strokeWidth="4"/><path d={figure.body} stroke="#78965e" strokeWidth="5"/></g></svg>;
}
