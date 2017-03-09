$(function () {

    var $menu = $('#menu');


    $.ajax({
        type:'GET',
        url: 'https://momnpopbarista.herokuapp.com/products',
        success: function(products){
            $.each(products, function(i, products){

                $menu.append('<tr>'
                    + '<td>'
                    + products.Name
                    + '</td>'
                    + '<td>'
                    + products.Price
                    + '</td>'
                    + '<td>'
                    + products.Size
                    + '</td>'
                    + '</tr>')

            })
        }
    }
);

});
