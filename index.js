function loadD3() {
    console.log('teststests');
    d3.csv("/data/proj_march_25.csv", function(data) {
        for (var i = 0; i < data.length; i++) {
            console.log(data[i].Name);
            console.log(data[i].Age);
        }
    });
}

loadD3();