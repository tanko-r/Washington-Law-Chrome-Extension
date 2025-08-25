
function test_unitAreLvl(p_obj){// {law_mocks, pos}
    var unitsArray = [];
    var unit = null;

    for (var n = 0; n < p_obj.law_mocks.length; ++n) {
        unit = new Unit(p_obj.law_mocks[n], unitsArray, unitsArray.length);
        unit.enum =
        unitsArray.push(unit);
    }

    if (p_obj.lvl === 3){

        return Unit.prototype.unitIsLvl3.call(unitsArray[p_obj.pos]) === p_obj.eq;

    } else {

        return Unit.prototype.unitIsLvl5.call(unitsArray[p_obj.pos]) === p_obj.eq;
    }
}

function test_it(p_law_mocks){

    p_law_mocks.forEach(function(obj) {
        var div = document.createElement('div');

        var law_mocks = obj.arr.map(function(elem){

            var el = document.createElement('div');
            el.innerHTML = elem;

            return el;
        });

        if (obj.last) {

            law_mocks[law_mocks.length -1].className = 'lawreference';
        }

        var test = test_unitAreLvl({ law_mocks: law_mocks,
                                     pos: obj.p,
                                     lvl: obj.l,
                                     eq: obj.eq });

        div.innerHTML = 'Enum IS level '+ obj.l +': '
                        + obj.m
                        + ' - '
                        +  obj.eq
                        + ' - '
                        + ((test)? test: '<span style="color: red;">false</span>');

        document.body.appendChild(div);

        console.log('******************** enum IS level '+ obj.l +': ',
                obj.m,
                obj.eq,
                test);
    });
}

var law_mocks_3 = [
        {m: '(i)(ii)(iii)', p: 1, l: 3, arr: ['(i) txt', '(ii) txt', '(iii) txt'], eq: true },
        {m: '(iv)(v)(vi)',  p: 1, l: 3, arr: ['(iv) txt', '(v) txt', '(vi) txt'], eq: true },
        {m: '(b)(i)(ii)',   p: 1, l: 3, arr: ['(b) txt', '(i) txt', '(ii) txt'], eq: true },
        {m: '(bb)(i)(ii)',   p: 1, l: 3, arr: ['(b) txt', '(i) txt', '(ii) txt'], eq: true },
        {m: '(h)(i)(ii)',   p: 1, l: 3, arr: ['(h) txt', '(i) txt', '(ii) txt'], eq: true },
        {m: '(C)(i)(ii)',   p: 1, l: 3, arr: ['(C) txt', '(i) txt', '(ii) txt'], eq: true },
        {m: '*(C)(v)(i)',   p: 1, l: 3, arr: ['(H) txt', '(i) txt', '(i) txt'], eq: false },
        {m: '(D)(v)(h)',    p: 1, l: 3, arr: ['(D) txt', '(v) txt', '(h) txt'], eq: true },
        {m: '(h)(i)(i)',    p: 1, l: 3, arr: ['(h) txt', '(i) txt', '(i) txt'], eq: false },
        {m: '(h)(i)(j)',    p: 1, l: 3, arr: ['(h) txt', '(i) txt', '(j) txt'], eq: false },
        {m: '(H)(i)(i)',    p: 1, l: 3, arr: ['(H) txt', '(i) txt', '(i) txt'], eq: false },
        {m: '(3)(i)(ii)',   p: 1, l: 3, arr: ['(3) txt', '(i) txt', '(ii) txt'], eq: true },
        {m: '(1)(i)(2)',    p: 1, l: 3, arr: ['(1) txt', '(i) txt', '(2) txt'], eq: true },
        {m: '(2)(i)para',   p: 1, l: 3, arr: ['(2) txt', '(i) txt', 'para'], eq: true },
        {m: '(2)(i)(A)',    p: 1, l: 3, arr: ['(2) txt', '(i) txt', '(A)'], eq: true, },
        {m: '(c)(i)\\n(A)', p: 1, l: 3, arr: ['(b) txt', '(c)(i) txt', '(A) txt'], eq: false },
        {m: '(xix)(xx)\\n(C)', p: 1, l: 3, arr: ['(xix) txt', '(xx) txt', '(c) txt'], eq: true },
        {m: '(c)para(i)para(ii)', p: 2, l: 3, arr: ['(c) txt', 'para', '(i) txt', 'para', '(ii) txt'], eq: true },
        {m: '(c)para(i)para(A)', p: 2, l: 3, arr: ['(c) txt', 'para', '(i) txt', 'para', '(A) txt'], eq: true },
        {m: '(1)(a)(i)\\n(ii)(2)', p: 1, l: 3, arr: ['(1)(a)(i) txt', '(ii) txt', '(2) txt'], eq: true },
        {m: '(1)(a)(i)\\n(ii)(iii)', p: 1, l: 3, arr: ['(1)(a)(i) txt', '(ii) txt', '(iii) txt'], eq: true },
        {m: '(a)(1)(i)\\n(ii)(iii)', p: 1, l: 3, arr: ['(a)(1)(i) txt', '(ii) txt', '(iii) txt'], eq: true },
        {m: '(i)(ii)para para<-lawref', p: 1, l: 3, arr: ['(i) txt', '(ii) txt', 'para', 'para'], last: false, eq: true, },
        {m: '*(i)(i)(i)',  p: 1, l: 3, arr: ['(i) txt', '(i) txt', '(i) txt'], eq: false },
        {m: '*(iv)(v)(i)', p: 1, l: 3, arr: ['(iv) txt', '(v) txt', '(i) txt'], eq: false },
        {m: '*(h)(i)para para<-lawref', p: 1, l: 3, arr: ['(h) txt', '(i) txt', 'para', 'para'], last: false, eq: true, },
    ];

var law_mocks_5 = [
   {m: '(B)(I)(II)',  p: 1, l: 5, arr: ['(B) txt', '(I) txt', '(II) txt'], eq: true },
   {m: '^(B)(I)(C)',   p: 1, l: 5, arr: ['(B) txt', '(I) txt', '(C) txt'], eq: true },
   {m: '(H)(I)(J)',   p: 1, l: 5, arr: ['(H) txt', '(I) txt', '(J) txt'], eq: false },
   {m: '(I)(I)(II)',  p: 1, l: 5, arr: ['(I) txt', '(I) txt', '(II) txt'], eq: true },
   {m: '(IV)(V)(VI)', p: 1, l: 5, arr: ['(IV) txt', '(V) txt', '(VI) txt'], eq: true },
   {m: '(1)(I)(II)', p: 1, l: 5, arr: ['(1) txt', '(I) txt', '(II) txt'], eq: true },
   {m: '*(IV)(V)(I)', p: 1, l: 5, arr: ['(IV) txt', '(V) txt', '(I) txt'], eq: false },
];

//test_it(law_mocks_3);
//test_it(law_mocks_5);
