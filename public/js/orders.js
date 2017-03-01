$(function () {

    var $orders = $('#orders');

    $.ajax({
        type:'GET',
        url: 'https://momnpopbarista.herokuapp.com/dueorders',
        success: function(orders){
            console.log(orders)
            $.each(orders.dueOrders, function(i, orders){


                $orders.append('<tr>'
                    + '<td>'
                    + orders.CustomerName
                    + '</td>'
                    + '<td>'
                    + orders.Total
                    + '</td>'
                    + '<td>'
                        +'<ul id=items>'
                        +'</ul>'
                    + '</td>'
                    + '</tr>')

            })
        }
    }
);
});
